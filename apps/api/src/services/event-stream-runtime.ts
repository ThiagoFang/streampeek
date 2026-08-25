import { createLogger } from "../lib/logger";
import { subscribe } from "../lib/redis";
import { getConnectionManager } from "./connection-manager";
import { createEventStreamService } from "./event-stream";
import { SessionResolver } from "./session-resolver-runtime";

const HEARTBEAT_INTERVAL_MS = 30_000;
const logger = createLogger({ component: "event-stream" });
const connectionManager = getConnectionManager();

export const EventStreamService = createEventStreamService({
  resolveUserId: async (sessionId) => {
    const session = await SessionResolver.bySessionId(sessionId);
    return session?.user_id ?? null;
  },
  subscribe: (userId, handler) => subscribe(`stream:${userId}`, handler),
  replaceConnection: (userId, createConnection) =>
    connectionManager.replace(userId, createConnection),
  deleteConnection: (userId, connection) => connectionManager.delete(userId, connection),
  heartbeatIntervalMs: HEARTBEAT_INTERVAL_MS,
  reportError: (err) => {
    logger.error({ err }, "Event stream error");
  },
});
