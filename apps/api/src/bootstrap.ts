import { closePolling, createPollWorker, synchronizeUserPolls } from "./services/polling";
import { startCleanupJob } from "./services/session-cleanup";
import { getConnectionManager } from "./services/connection-manager";
import { DbAuthToken } from "./db/queries/auth-token";
import { db } from "./db";
import { redis, redisSub } from "./lib/redis";
import { log } from "./lib/logger";

export async function initializeApp() {
  await synchronizeExistingPolls();

  const worker = createPollWorker();
  const stopCleanupJob = startCleanupJob();
  setupGracefulShutdown(worker, stopCleanupJob);

  log.info({}, "Application initialized");
}

async function synchronizeExistingPolls() {
  const tokens = await DbAuthToken.getAll();
  await synchronizeUserPolls(tokens.map((token) => token.user_id));
  log.info({ count: tokens.length }, "Scheduled poll jobs");
}

function setupGracefulShutdown(
  worker: ReturnType<typeof createPollWorker>,
  stopCleanupJob: () => void,
) {
  let shuttingDown = false;

  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    log.info({}, "Shutting down gracefully...");

    stopCleanupJob();
    await worker.close();
    await closePolling();
    await getConnectionManager().closeAll();
    await db.destroy();
    await redis.quit();
    await redisSub.quit();

    log.info({}, "Shutdown complete");
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}
