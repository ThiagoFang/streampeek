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
import { TwitchEventSub } from "./services/eventsub";

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

  eventsub.connect(tokenData.access_token, envVariables.TWITCH_CLIENT_ID, userData.id);

  return c.html("<html><body><h1>Login concluído!</h1><p>Pode fechar esta aba.</p></body></html>");
});

app.get("/events", async (c) => {
  const sessionId = c.req.query("session");
  if (!sessionId) return c.json({ error: "UNAUTHORIZED" }, 401);

  const token = await DbAuthToken.getBySessionId(sessionId);
  if (!token) return c.json({ error: "UNAUTHORIZED" }, 401);

  return streamSSE(c, async (stream) => {
    const unsubscribe = streamEventBus.subscribe((event) => {
      stream.writeSSE({ data: JSON.stringify(event) });
    });

    stream.onAbort(() => {
      unsubscribe();
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

const eventsub = new TwitchEventSub(streamEventBus);

TwitchAuth.onLogout = () => eventsub.disconnect();

async function initEventSub() {
  const token = await DbAuthToken.getFirst();
  if (!token) return;

  if (new Date(token.expires_at) <= new Date()) {
    const refreshed = await TwitchAuth.refreshToken(token).catch(() => null);
    if (!refreshed) return;
    eventsub.connect(refreshed.access_token, envVariables.TWITCH_CLIENT_ID, refreshed.user_id);
    return;
  }

  eventsub.connect(token.access_token, envVariables.TWITCH_CLIENT_ID, token.user_id);
}

initEventSub();

export default {
  port: envVariables.PORT,
  fetch: app.fetch,
};
