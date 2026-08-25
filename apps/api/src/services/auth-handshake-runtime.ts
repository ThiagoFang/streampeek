import { redis } from "../lib/redis";
import { createAuthHandshake } from "./auth-handshake";

const authorizationKey = (state: string) => `auth:authorization:${state}`;
const sessionKey = (state: string) => `auth:session:${state}`;

export const AuthHandshake = createAuthHandshake({
  async reserveAuthorization(state, ttlSeconds) {
    const result = await redis.set(authorizationKey(state), "pending", "EX", ttlSeconds, "NX");
    return result === "OK";
  },

  async consumeAuthorization(state) {
    return (await redis.getdel(authorizationKey(state))) === "pending";
  },

  async publishSession(state, sessionId, ttlSeconds) {
    await redis.set(sessionKey(state), sessionId, "EX", ttlSeconds);
  },

  claimSession(state) {
    return redis.getdel(sessionKey(state));
  },
});
