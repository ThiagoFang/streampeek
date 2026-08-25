import { RPCHandler } from "@orpc/server/fetch";
import { initializeApp } from "./bootstrap";
import { createHttpApp } from "./http-app";
import { envVariables } from "./lib/env";
import { log } from "./lib/logger";
import { rateLimitMiddleware } from "./middleware/rate-limit";
import { router } from "./rpc/router";
import { handleAuthCallback } from "./routes/auth-callback";
import { handleEvents } from "./routes/events";
import { handleHealth } from "./routes/health";

const rpcHandler = new RPCHandler(router);
const app = createHttpApp({
  corsOrigins: envVariables.CORS_ORIGIN,
  rateLimit: rateLimitMiddleware(),
  authCallback: handleAuthCallback,
  events: handleEvents,
  health: handleHealth,
  rpcHandler: {
    handle: (request, options) => rpcHandler.handle(request, options),
  },
  reportValidationError: (summary) => {
    log.warn({ details: summary }, "Validation error");
  },
  reportUnhandledError: (err) => {
    log.error({ err }, "Unhandled error in server");
  },
});

await initializeApp();

export default {
  port: envVariables.PORT,
  fetch: app.fetch,
};
