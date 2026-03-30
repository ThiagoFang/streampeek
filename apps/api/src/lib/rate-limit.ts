import { redis } from "./redis";

const RATE_LIMIT_WINDOW = 60;
const RATE_LIMIT_MAX = 60;

export async function checkRateLimit(key: string): Promise<boolean> {
  const fullKey = `ratelimit:${key}`;
  const current = await redis.incr(fullKey);

  if (current === 1) {
    await redis.expire(fullKey, RATE_LIMIT_WINDOW);
  }

  return current <= RATE_LIMIT_MAX;
}

export async function checkRateLimitDetailed(key: string): Promise<{
  allowed: boolean;
  remaining: number;
  resetIn: number;
}> {
  const fullKey = `ratelimit:${key}`;
  const current = await redis.incr(fullKey);

  if (current === 1) {
    await redis.expire(fullKey, RATE_LIMIT_WINDOW);
  }

  const ttl = await redis.ttl(fullKey);
  const remaining = Math.max(0, RATE_LIMIT_MAX - current);

  return {
    allowed: current <= RATE_LIMIT_MAX,
    remaining,
    resetIn: ttl > 0 ? ttl : RATE_LIMIT_WINDOW,
  };
}

export function getClientKey(headers: Headers): string {
  const auth = headers.get("Authorization");
  if (auth?.startsWith("Session ")) {
    return `session:${auth.slice(8)}`;
  }
  return `ip:${headers.get("x-forwarded-for") || "unknown"}`;
}