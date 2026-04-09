import { describe, it, expect, beforeEach } from "bun:test";
import { checkRateLimit, getClientKey } from "../lib/rate-limit";
import { redis } from "../lib/redis";

describe("rate-limit", () => {
  beforeEach(async () => {
    const keys = await redis.keys("ratelimit:test:*");
    if (keys.length) await redis.del(...keys);
  });

  it("allows requests under the limit", async () => {
    const allowed = await checkRateLimit("test:under-limit");
    expect(allowed).toBe(true);
  });

  it("blocks after 60 requests", async () => {
    const key = "test:over-limit";

    for (let i = 0; i < 60; i++) {
      const allowed = await checkRateLimit(key);
      expect(allowed).toBe(true);
    }

    const blocked = await checkRateLimit(key);
    expect(blocked).toBe(false);
  });

  it("resets after window expires", async () => {
    const key = "test:ttl-check";
    await checkRateLimit(key);

    const ttl = await redis.ttl(`ratelimit:${key}`);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(60);
  });
});

describe("getClientKey", () => {
  it("uses session id when Authorization header is present", () => {
    const headers = new Headers({ Authorization: "Session abc-123" });
    expect(getClientKey(headers)).toBe("session:abc-123");
  });

  it("uses x-forwarded-for when no session", () => {
    const headers = new Headers({ "x-forwarded-for": "1.2.3.4" });
    expect(getClientKey(headers)).toBe("ip:1.2.3.4");
  });

  it("falls back to unknown when no identifying headers", () => {
    const headers = new Headers();
    expect(getClientKey(headers)).toBe("ip:unknown");
  });
});
