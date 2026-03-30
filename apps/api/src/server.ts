import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { cors } from "hono/cors";
import { type } from "arktype";
import { RPCHandler } from "@orpc/server/fetch";
import { envVariables } from "./lib/env";
import { router } from "./rpc/router";
import { TwitchAuth } from "./services/twitch-auth";
import { AuthSchemas } from "./schemas/auth";
import { subscribe } from "./lib/redis";
import { checkRateLimit, getClientKey } from "./lib/rate-limit";
import { DbAuthToken } from "./db/queries/auth-token";
import { scheduleUserPoll, removeUserPoll, createPollWorker } from "./services/poll-worker";
import { startCleanupJob } from "./services/session-cleanup";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: envVariables.CORS_ORIGIN,
    credentials: true,
  }),
);

app.get("/auth/twitch/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const validated = AuthSchemas.callbackQuery.assert({ code, state });

  if (!(await TwitchAuth.validateState(validated.state))) {
    return c.html("<html><body><h1>Erro</h1><p>Estado inválido.</p></body></html>");
  }

  const tokenData = await TwitchAuth.exchangeCode(validated.code);
  const userData = await TwitchAuth.getUser(tokenData.access_token);
  await TwitchAuth.saveToken(validated.state, tokenData, userData);

  const token = await DbAuthToken.getByUserId(userData.id);
  if (token) {
    await scheduleUserPoll(token.session_id);
  }

  return c.html("<html><body><h1>Login concluído!</h1><p>Pode fechar esta aba.</p></body></html>");
});

const activeConnections = new Map<string, { abort: () => void; unsubscribe: () => void }>();

app.get("/events", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Session ")) return c.json({ error: "UNAUTHORIZED" }, 401);

  const sessionId = authHeader.slice(8);
  const token = await DbAuthToken.getBySessionId(sessionId);
  if (!token) return c.json({ error: "UNAUTHORIZED" }, 401);

  const existing = activeConnections.get(token.user_id);
  if (existing) {
    existing.unsubscribe();
  }

    return streamSSE(c, async (stream) => {
    const unsubscribe = await subscribe(`stream:${token.user_id}`, (message) => {
      stream.writeSSE({ data: message });
    });

    activeConnections.set(token.user_id, {
      abort: () => stream.abort(),
      unsubscribe,
    });

    stream.onAbort(() => {
      unsubscribe();
      activeConnections.delete(token.user_id);
    });

    while (true) {
      await stream.sleep(30000);
    }
  });
});

const rpcHandler = new RPCHandler(router);

app.all("/rpc/*", async (c) => {
  const key = getClientKey(c.req.raw.headers);
  if (!(await checkRateLimit(key))) {
    return c.json({ error: "RATE_LIMITED" }, 429);
  }

  const result = await rpcHandler.handle(c.req.raw, {
    prefix: "/rpc",
    context: { reqHeaders: c.req.raw.headers },
  });
  if (result.matched) return result.response;
  return c.json({ error: "NOT_FOUND" }, 404);
});

app.onError((err, c) => {
  if (err instanceof type.errors) {
    return c.json({ error: "VALIDATION_ERROR", details: err.summary }, 400);
  }

  if ("status" in err && typeof err.status === "number") {
    return c.json({ error: "EXTERNAL_API_ERROR" }, 502);
  }

  console.error(err);
  return c.json({ error: "INTERNAL_ERROR" }, 500);
});

createPollWorker();

TwitchAuth.onLogout = async (userId) => {
  const tokens = await DbAuthToken.getAll();
  const token = tokens.find((t) => t.user_id === userId);
  if (token) {
    await removeUserPoll(token.session_id);
  }
};

async function initPoller() {
  const tokens = await DbAuthToken.getAll();
  for (const token of tokens) {
    await scheduleUserPoll(token.session_id);
  }
}

initPoller().then(() => {
  console.log("[Server] Poll jobs scheduled");
});

startCleanupJob();

export default {
  port: envVariables.PORT,
  fetch: app.fetch,
};