import { Hono } from "hono";
import { cors } from "hono/cors";
import { type } from "arktype";
import { RPCHandler } from "@orpc/server/fetch";
import { envVariables } from "./lib/env";
import { router } from "./rpc/router";
import { TwitchAuth } from "./services/twitch-auth";
import { AuthSchemas } from "./schemas/auth";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: envVariables.CORS_ORIGIN,
    credentials: true,
  }),
);

// Twitch callback — stays as Hono (returns HTML, browser redirect)
app.get("/auth/twitch/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const validated = AuthSchemas.callbackQuery.assert({ code, state });

  if (!TwitchAuth.validateState(validated.state))
    return c.json({ error: "INVALID_STATE" }, 403);

  const tokenData = await TwitchAuth.exchangeCode(validated.code);
  const userData = await TwitchAuth.getUser(tokenData.access_token);
  await TwitchAuth.saveToken(validated.state, tokenData, userData);

  return c.html(
    "<html><body><h1>Login concluído!</h1><p>Pode fechar esta aba.</p></body></html>",
  );
});

// oRPC handler
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
    return c.json(
      { error: "VALIDATION_ERROR", details: err.summary },
      400,
    );
  }

  if ("status" in err && typeof err.status === "number") {
    return c.json({ error: "EXTERNAL_API_ERROR" }, 502);
  }

  console.error(err);
  return c.json({ error: "INTERNAL_ERROR" }, 500);
});

export default {
  port: envVariables.PORT,
  fetch: app.fetch,
};
