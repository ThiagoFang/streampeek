import { Hono } from "hono";
import { cors } from "hono/cors";
import { type } from "arktype";
import { RPCHandler } from "@orpc/server/fetch";
import { envVariables } from "./lib/env";
import { router } from "./rpc/router";
import { checkRateLimit, getClientKey } from "./lib/rate-limit";
import { handleAuthCallback } from "./routes/auth-callback";
import { handleEvents } from "./routes/events";
import { initializeApp } from "./bootstrap";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: envVariables.CORS_ORIGIN,
    credentials: true,
  }),
);

app.get("/auth/twitch/callback", handleAuthCallback);

app.get("/events", handleEvents);

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

initializeApp();

export default {
  port: envVariables.PORT,
  fetch: app.fetch,
};