import { afterAll, describe, expect, it } from "bun:test";
import { redis } from "../lib/redis";
import { createAuthHandshake } from "../services/auth-handshake";
import { AuthHandshake } from "../services/auth-handshake-runtime";

const createdStates: string[] = [];

async function beginTestHandshake() {
  const state = await AuthHandshake.begin();
  createdStates.push(state);
  return state;
}

afterAll(async () => {
  const keys = createdStates.flatMap((state) => [
    `auth:authorization:${state}`,
    `auth:session:${state}`,
  ]);
  if (keys.length) await redis.del(...keys);
});

describe("authentication handshake", () => {
  it("creates a pending authorization with an expiration", async () => {
    const state = await beginTestHandshake();

    expect(await redis.get(`auth:authorization:${state}`)).toBe("pending");
    expect(await redis.ttl(`auth:authorization:${state}`)).toBeGreaterThan(0);
  });

  it("accepts an authorization callback only once", async () => {
    const state = await beginTestHandshake();

    const attempts = await Promise.all([
      AuthHandshake.acceptCallback(state),
      AuthHandshake.acceptCallback(state),
    ]);

    expect(attempts.filter(Boolean)).toHaveLength(1);
    expect(attempts.filter((accepted) => !accepted)).toHaveLength(1);
  });

  it("rejects an unknown authorization callback", async () => {
    expect(await AuthHandshake.acceptCallback("unknown-state")).toBe(false);
  });

  it("delivers a completed session only once", async () => {
    const state = await beginTestHandshake();
    const sessionId = crypto.randomUUID();
    expect(await AuthHandshake.acceptCallback(state)).toBe(true);
    await AuthHandshake.publishSession(state, sessionId);

    const claims = await Promise.all([
      AuthHandshake.claimSession(state),
      AuthHandshake.claimSession(state),
    ]);

    expect(claims.filter((claimed) => claimed === sessionId)).toHaveLength(1);
    expect(claims.filter((claimed) => claimed === null)).toHaveLength(1);
  });

  it("keeps pending authorization and completed session in separate keys", async () => {
    const state = await beginTestHandshake();
    await AuthHandshake.publishSession(state, "session-1");

    expect(await redis.get(`auth:authorization:${state}`)).toBe("pending");
    expect(await redis.get(`auth:session:${state}`)).toBe("session-1");
  });

  it("tries another state when a generated value is already reserved", async () => {
    const reservedStates = new Set(["duplicate-state"]);
    const generatedStates = ["duplicate-state", "unique-state"];
    const handshake = createAuthHandshake(
      {
        async reserveAuthorization(state) {
          if (reservedStates.has(state)) return false;
          reservedStates.add(state);
          return true;
        },
        async consumeAuthorization() {
          return false;
        },
        async publishSession() {},
        async claimSession() {
          return null;
        },
      },
      { generateState: () => generatedStates.shift() ?? "unexpected-state" },
    );

    expect(await handshake.begin()).toBe("unique-state");
  });
});
