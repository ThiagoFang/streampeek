import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { cors } from "hono/cors";
import { type } from "arktype";
import { RPCHandler } from "@orpc/server/fetch";
import { envVariables } from "./lib/env";
import { router } from "./rpc/router";
import { TwitchAuth } from "./services/twitch-auth";
import { AuthSchemas } from "./schemas/auth";
import { streamEventBus } from "./lib/event-bus";
import { DbAuthToken } from "./db/queries/auth-token";
import { PollerManager } from "./services/stream-poller";

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

  if (!TwitchAuth.validateState(validated.state)) return c.json({ error: "INVALID_STATE" }, 403);

  const tokenData = await TwitchAuth.exchangeCode(validated.code);
  const userData = await TwitchAuth.getUser(tokenData.access_token);
  await TwitchAuth.saveToken(validated.state, tokenData, userData);

  pollerManager.start(tokenData.access_token, userData.id);

  return c.html("<html><body><h1>Login concluído!</h1><p>Pode fechar esta aba.</p></body></html>");
});

const activeConnections = new Map<string, () => void>();

app.get("/events", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Session ")) return c.json({ error: "UNAUTHORIZED" }, 401);

  const sessionId = authHeader.slice(8);
  const token = await DbAuthToken.getBySessionId(sessionId);
  if (!token) return c.json({ error: "UNAUTHORIZED" }, 401);

  const previousAbort = activeConnections.get(token.user_id);
  if (previousAbort) previousAbort();

  return streamSSE(c, async (stream) => {
    activeConnections.set(token.user_id, () => stream.abort());

    const unsubscribe = streamEventBus.subscribe(token.user_id, (event) => {
      stream.writeSSE({ data: JSON.stringify(event) });
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

const pollerManager = new PollerManager(streamEventBus);

TwitchAuth.onLogout = (userId) => pollerManager.stop(userId);

async function initPoller() {
  const tokens = await DbAuthToken.getAll();

  for (const token of tokens) {
    if (new Date(token.expires_at) <= new Date()) {
      const refreshed = await TwitchAuth.refreshToken(token).catch(() => null);
      if (refreshed) pollerManager.start(refreshed.access_token, refreshed.user_id);
    } else {
      pollerManager.start(token.access_token, token.user_id);
    }
  }
}

initPoller();

export default {
  port: envVariables.PORT,
  fetch: app.fetch,
};
