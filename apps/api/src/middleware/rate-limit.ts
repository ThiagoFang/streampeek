import { MiddlewareHandler } from "hono";
import { checkRateLimit, getClientKey } from "../lib/rate-limit";

export function rateLimitMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    const key = getClientKey(c.req.raw.headers);
    const allowed = await checkRateLimit(key);

    if (!allowed) {
      return c.json({ error: "RATE_LIMITED" }, 429);
    }

    await next();
  };
}