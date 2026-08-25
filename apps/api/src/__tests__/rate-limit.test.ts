import { describe, it, expect, beforeEach } from "bun:test";
import { consumeRateLimit, getClientKey } from "../lib/rate-limit";
import { redis } from "../lib/redis";

describe("rate-limit", () => {
  beforeEach(async () => {
    const keys = await redis.keys("ratelimit:test:*");
    if (keys.length) await redis.del(...keys);
  });

  it("allows requests under the limit", async () => {
    const decision = await consumeRateLimit("test:under-limit");
    expect(decision).toEqual({ allowed: true, remaining: 59, retryAfter: 60 });
  });

  it("blocks after 60 requests", async () => {
    const key = "test:over-limit";

    for (let i = 0; i < 60; i++) {
      const decision = await consumeRateLimit(key);
      expect(decision.allowed).toBe(true);
    }

    const blocked = await consumeRateLimit(key);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("sets the expiration in the same operation as the counter", async () => {
    const key = "test:ttl-check";
    await consumeRateLimit(key);

    const ttl = await redis.ttl(`ratelimit:${key}`);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(60);
  });

  it("repairs a legacy counter that has no expiration", async () => {
    const key = "test:legacy-no-ttl";
    await redis.set(`ratelimit:${key}`, 60);

    const decision = await consumeRateLimit(key);

    expect(decision.allowed).toBe(false);
    expect(await redis.ttl(`ratelimit:${key}`)).toBeGreaterThan(0);
  });

  it("allows exactly 60 simultaneous requests", async () => {
    const decisions = await Promise.all(
      Array.from({ length: 61 }, () => consumeRateLimit("test:simultaneous")),
    );

    expect(decisions.filter((decision) => decision.allowed)).toHaveLength(60);
    expect(decisions.filter((decision) => !decision.allowed)).toHaveLength(1);
  });
});

describe("getClientKey", () => {
  it("uses the client IP supplied by Railway", () => {
    const headers = new Headers({ "x-real-ip": "5.6.7.8" });
    expect(getClientKey(headers)).toBe("ip:5.6.7.8");
  });

  it("accepts an IPv6 client address", () => {
    const headers = new Headers({ "x-real-ip": "2001:db8::1" });
    expect(getClientKey(headers)).toBe("ip:2001:db8::1");
  });

  it("does not trust unverified session or forwarded-for headers", () => {
    const headers = new Headers({
      Authorization: "Session attacker-controlled",
      "x-forwarded-for": "1.2.3.4",
      "x-real-ip": "5.6.7.8",
    });
    expect(getClientKey(headers)).toBe("ip:5.6.7.8");
  });

  it("does not create arbitrary Redis keys from malformed addresses", () => {
    const headers = new Headers({ "x-real-ip": "not-an-ip" });
    expect(getClientKey(headers)).toBe("ip:unknown");
  });

  it("falls back to a shared key outside Railway", () => {
    expect(getClientKey(new Headers())).toBe("ip:unknown");
  });
});
