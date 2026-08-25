import { createApplicationLifecycle } from "./app-lifecycle";
import { db } from "./db";
import { DbAuthToken } from "./db/queries/auth-token";
import { log } from "./lib/logger";
import { redis, redisSub } from "./lib/redis";
import { getConnectionManager } from "./services/connection-manager";
import { closePolling, createPollWorker, synchronizeUserPolls } from "./services/polling";
import { startCleanupJob } from "./services/session-cleanup-runtime";

const lifecycle = createApplicationLifecycle({
  loadPollingUserIds: async () => {
    const tokens = await DbAuthToken.getAll();
    return tokens.map((token) => token.user_id);
  },
  synchronizePolls: synchronizeUserPolls,
  createPollWorker,
  startCleanupJob,
  closeResources: [
    { name: "poll queue", close: closePolling },
    { name: "SSE connections", close: () => getConnectionManager().closeAll() },
    { name: "database", close: () => db.destroy() },
    { name: "Redis publisher", close: () => redis.quit() },
    { name: "Redis subscriber", close: () => redisSub.quit() },
  ],
});

let signalsRegistered = false;

function registerShutdownSignals() {
  if (signalsRegistered) return;
  signalsRegistered = true;

  const shutdown = () => {
    log.info({}, "Shutting down gracefully...");

    void lifecycle.shutdown().then(
      () => {
        log.info({}, "Shutdown complete");
        process.exit(0);
      },
      (err) => {
        log.error({ err }, "Shutdown completed with errors");
        process.exit(1);
      },
    );
  };

  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}

export async function initializeApp() {
  registerShutdownSignals();

  try {
    const { scheduledUserCount } = await lifecycle.start();
    log.info({ count: scheduledUserCount }, "Application initialized");
  } catch (startError) {
    try {
      await lifecycle.shutdown();
    } catch (shutdownError) {
      log.error({ err: shutdownError }, "Failed to clean up after startup error");
    }

    throw startError;
  }
}
