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

export function getClientKey(headers: Headers): string {
  const auth = headers.get("Authorization");
  if (auth?.startsWith("Session ")) {
    return `session:${auth.slice(8)}`;
  }
  return `ip:${headers.get("x-forwarded-for") || "unknown"}`;
}