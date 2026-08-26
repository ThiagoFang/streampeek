import { redis } from "../lib/redis";
import { createAuthHandshake } from "./auth-handshake";

const authorizationKey = (state: string) => `auth:authorization:${state}`;
const sessionKey = (state: string) => `auth:session:${state}`;
const sessionReceiptKey = (state: string) => `auth:session-receipt:${state}`;
const cancellationKey = (state: string) => `auth:canceled:${state}`;

const PUBLISH_SESSION_SCRIPT = `
  if redis.call("EXISTS", KEYS[1]) == 1 then
    return 0
  end

  redis.call("SET", KEYS[2], ARGV[1], "EX", ARGV[2])
  redis.call("SET", KEYS[3], ARGV[1], "EX", ARGV[2])
  return 1
`;

const CANCEL_AUTHORIZATION_SCRIPT = `
  redis.call("SET", KEYS[1], "canceled", "EX", ARGV[1])
  redis.call("DEL", KEYS[2])

  local session_id = redis.call("GET", KEYS[3])
  if not session_id then
    session_id = redis.call("GET", KEYS[4])
  end

  redis.call("DEL", KEYS[3], KEYS[4])
  return session_id
`;

export const AuthHandshake = createAuthHandshake({
  async reserveAuthorization(state, ttlSeconds) {
    const result = await redis.set(authorizationKey(state), "pending", "EX", ttlSeconds, "NX");
    return result === "OK";
  },

  async consumeAuthorization(state) {
    return (await redis.getdel(authorizationKey(state))) === "pending";
  },

  async publishSession(state, sessionId, ttlSeconds) {
    const result = await redis.eval(
      PUBLISH_SESSION_SCRIPT,
      3,
      cancellationKey(state),
      sessionKey(state),
      sessionReceiptKey(state),
      sessionId,
      ttlSeconds,
    );
    return result === 1;
  },

  claimSession(state) {
    return redis.getdel(sessionKey(state));
  },

  async cancelAuthorization(state, ttlSeconds) {
    const sessionId = await redis.eval(
      CANCEL_AUTHORIZATION_SCRIPT,
      4,
      cancellationKey(state),
      authorizationKey(state),
      sessionKey(state),
      sessionReceiptKey(state),
      ttlSeconds,
    );
    return typeof sessionId === "string" ? sessionId : null;
  },
});
