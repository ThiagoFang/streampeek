import { createPollWorker, scheduleUserPoll, removeUserPoll } from "./services/polling";
import { startCleanupJob } from "./services/session-cleanup";
import { getConnectionManager } from "./services/connection-manager";
import { TwitchAuth } from "./services/twitch-auth";
import { DbAuthToken } from "./db/queries/auth-token";
import { db } from "./db";
import { redis, redisSub } from "./lib/redis";
import { log } from "./lib/logger";

export async function initializeApp() {
  const worker = createPollWorker();
  const connectionManager = getConnectionManager();

  setupGracefulShutdown(worker);

  TwitchAuth.onLogout = async ({ userId, sessionId }) => {
    await Promise.all([removeUserPoll(sessionId), connectionManager.close(userId)]);
  };

  await scheduleExistingPolls();

  startCleanupJob();

  log.info({}, "Application initialized");
}

async function scheduleExistingPolls() {
  const tokens = await DbAuthToken.getAll();
  for (const token of tokens) {
    await scheduleUserPoll(token.session_id);
  }
  log.info({ count: tokens.length }, "Scheduled poll jobs");
}

function setupGracefulShutdown(worker: ReturnType<typeof createPollWorker>) {
  const shutdown = async () => {
    log.info({}, "Shutting down gracefully...");

    await worker.close();
    await db.destroy();
    await redis.quit();
    await redisSub.quit();

    log.info({}, "Shutdown complete");
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}
