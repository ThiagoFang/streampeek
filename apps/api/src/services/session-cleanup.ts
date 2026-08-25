import { DbAuthToken } from "../db/queries/auth-token";
import { TwitchAuth } from "./twitch-auth";
import { createLogger } from "../lib/logger";

const logger = createLogger({ component: "session-cleanup" });
const INACTIVE_DAYS = 30;

export async function cleanupInactiveSessions() {
  const cutoff = new Date(Date.now() - INACTIVE_DAYS * 24 * 60 * 60 * 1000);
  const expiredTokens = await DbAuthToken.getExpiredBefore(cutoff);

  for (const token of expiredTokens) {
    logger.info({ sessionId: token.session_id }, "Removing expired session");
    await TwitchAuth.deleteToken(token.session_id);
  }
}

export function startCleanupJob() {
  const timer = setInterval(
    () => {
      cleanupInactiveSessions().catch((err) => {
        logger.error({ err }, "Cleanup failed");
      });
    },
    24 * 60 * 60 * 1000,
  );

  return () => clearInterval(timer);
}
