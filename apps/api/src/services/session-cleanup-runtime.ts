import { DbAuthToken } from "../db/queries/auth-token";
import { createLogger } from "../lib/logger";
import { AuthSession } from "./auth-session-runtime";
import { createSessionCleanup } from "./session-cleanup";

const DAY_MS = 24 * 60 * 60 * 1000;
const SESSION_RETENTION_MS = 30 * DAY_MS;
const CLEANUP_INTERVAL_MS = DAY_MS;
const logger = createLogger({ component: "session-cleanup" });

export const SessionCleanup = createSessionCleanup({
  findExpiredBefore: DbAuthToken.getExpiredBefore,
  deleteSession: AuthSession.delete,
  now: () => Date.now(),
  retentionMs: SESSION_RETENTION_MS,
  intervalMs: CLEANUP_INTERVAL_MS,
  schedule: (operation, intervalMs) => {
    const timer = setInterval(operation, intervalMs);
    return () => clearInterval(timer);
  },
  reportResult: ({ scanned, removed, failures }) => {
    for (const failure of failures) {
      logger.error(
        { err: failure.error, sessionId: failure.sessionId },
        "Failed to remove expired session",
      );
    }

    logger.info({ scanned, removed, failed: failures.length }, "Session cleanup completed");
  },
  reportError: (err) => {
    logger.error({ err }, "Session cleanup failed");
  },
});

export function startCleanupJob() {
  return SessionCleanup.start();
}
