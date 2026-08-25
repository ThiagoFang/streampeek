import { Hono } from "hono";
import { cors } from "hono/cors";
import { type } from "arktype";
import { RPCHandler } from "@orpc/server/fetch";
import { envVariables } from "./lib/env";
import { router } from "./rpc/router";
import { handleAuthCallback } from "./routes/auth-callback";
import { handleEvents } from "./routes/events";
import { handleHealth } from "./routes/health";
import { rateLimitMiddleware } from "./middleware/rate-limit";
import { initializeApp } from "./bootstrap";
import { log } from "./lib/logger";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: envVariables.CORS_ORIGIN,
    credentials: true,
  }),
);

app.get("/auth/twitch/callback", rateLimitMiddleware(), handleAuthCallback);

app.get("/events", rateLimitMiddleware(), handleEvents);

app.get("/health", handleHealth);

const rpcHandler = new RPCHandler(router);

app.use("/rpc/*", rateLimitMiddleware());

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
    log.warn({ details: err.summary }, "Validation error");
    return c.json({ error: "VALIDATION_ERROR" }, 400);
  }

  if ("status" in err && typeof err.status === "number") {
    return c.json({ error: "EXTERNAL_API_ERROR" }, 502);
  }

  log.error({ err }, "Unhandled error in server");
  return c.json({ error: "INTERNAL_ERROR" }, 500);
});

initializeApp();

export default {
  port: envVariables.PORT,
  fetch: app.fetch,
};
