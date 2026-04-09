import { describe, it, expect, afterAll } from "bun:test";
import { redis } from "../lib/redis";

describe("auth state management", () => {
  const testKeys: string[] = [];

  async function generateTestState() {
    const state = crypto.randomUUID();
    const key = `auth:pending:${state}`;
    testKeys.push(key);
    await redis.setex(key, 600, "");
    return state;
  }

  afterAll(async () => {
    if (testKeys.length) await redis.del(...testKeys);
  });

  it("generates and validates state", async () => {
    const state = await generateTestState();

    const exists = await redis.exists(`auth:pending:${state}`);
    expect(exists).toBe(1);
  });

  it("rejects invalid state", async () => {
    const exists = await redis.exists("auth:pending:invalid-state");
    expect(exists).toBe(0);
  });

  it("claims session and deletes state", async () => {
    const state = await generateTestState();
    const sessionId = crypto.randomUUID();

    await redis.set(`auth:pending:${state}`, sessionId, "EX", 600);

    const claimed = await redis.get(`auth:pending:${state}`);
    expect(claimed).toBe(sessionId);

    await redis.del(`auth:pending:${state}`);

    const afterClaim = await redis.get(`auth:pending:${state}`);
    expect(afterClaim).toBeNull();
  });

  it("state expires after TTL", async () => {
    const state = crypto.randomUUID();
    const key = `auth:pending:${state}`;
    testKeys.push(key);

    await redis.setex(key, 1, "");

    await Bun.sleep(1100);

    const exists = await redis.exists(key);
    expect(exists).toBe(0);
  });

  it("session header parsing", () => {
    const header = "Session abc-123-def";
    expect(header.startsWith("Session ")).toBe(true);
    expect(header.slice(8)).toBe("abc-123-def");

    const invalid = "Bearer abc-123";
    expect(invalid.startsWith("Session ")).toBe(false);
  });
});
