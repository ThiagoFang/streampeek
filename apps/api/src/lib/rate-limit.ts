import { isIP } from "node:net";
import { redis } from "./redis";

const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_REQUESTS = 60;

const CONSUME_RATE_LIMIT_SCRIPT = `
local current = redis.call("INCR", KEYS[1])
local ttl = redis.call("TTL", KEYS[1])

if ttl < 0 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end

return { current, ttl }
`;

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
}

export async function consumeRateLimit(key: string): Promise<RateLimitDecision> {
  const fullKey = `ratelimit:${key}`;
  const result = await redis.eval(CONSUME_RATE_LIMIT_SCRIPT, 1, fullKey, RATE_LIMIT_WINDOW_SECONDS);

  if (!Array.isArray(result) || result.length !== 2) {
    throw new Error("Invalid rate limit response from Redis");
  }

  const current = Number(result[0]);
  const ttl = Number(result[1]);

  return {
    allowed: current <= RATE_LIMIT_MAX_REQUESTS,
    remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - current),
    retryAfter: Math.max(1, ttl),
  };
}

export function getClientKey(headers: Headers): string {
  // Production runs behind Railway, which supplies X-Real-IP. Authorization and
  // X-Forwarded-For are client-controlled at this point and must not identify the limiter.
  const realIp = headers.get("x-real-ip")?.trim();
  return `ip:${realIp && isIP(realIp) ? realIp : "unknown"}`;
}
