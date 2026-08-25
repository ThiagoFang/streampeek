import { MiddlewareHandler } from "hono";
import { consumeRateLimit, getClientKey } from "../lib/rate-limit";

export function rateLimitMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    const key = getClientKey(c.req.raw.headers);
    const decision = await consumeRateLimit(key);

    c.header("X-RateLimit-Remaining", String(decision.remaining));

    if (!decision.allowed) {
      c.header("Retry-After", String(decision.retryAfter));
      return c.json({ error: "RATE_LIMITED" }, 429);
    }

    await next();
  };
}
