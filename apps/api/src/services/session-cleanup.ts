import { DbAuthToken } from "../db/queries/auth-token";
import { removeUserPoll } from "./poll-worker";
import { createLogger } from "../lib/logger";

const logger = createLogger({ component: "session-cleanup" });
const INACTIVE_DAYS = 30;

export async function cleanupInactiveSessions() {
  const cutoff = new Date(Date.now() - INACTIVE_DAYS * 24 * 60 * 60 * 1000);
  const expiredTokens = await DbAuthToken.getExpiredBefore(cutoff);

  for (const token of expiredTokens) {
    logger.info({ sessionId: token.session_id }, "Removing expired session");
    await removeUserPoll(token.session_id);
    await DbAuthToken.deleteBySessionId(token.session_id);
  }
}

export function startCleanupJob() {
  setInterval(() => {
    cleanupInactiveSessions().catch((err) => {
      logger.error({ err }, "Cleanup failed");
    });
  }, 24 * 60 * 60 * 1000);
}