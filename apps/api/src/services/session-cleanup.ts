import { DbAuthToken } from "../db/queries/auth-token";
import { removeUserPoll } from "./poll-worker";

const INACTIVE_DAYS = 30;

export async function cleanupInactiveSessions() {
  const tokens = await DbAuthToken.getAll();
  const now = new Date();
  const cutoff = new Date(now.getTime() - INACTIVE_DAYS * 24 * 60 * 60 * 1000);

  for (const token of tokens) {
    if (new Date(token.expires_at) < cutoff) {
      console.log(`[Cleanup] Removing expired session: ${token.session_id}`);
      await removeUserPoll(token.session_id);
      await DbAuthToken.deleteBySessionId(token.session_id);
    }
  }
}

export function startCleanupJob() {
  setInterval(() => {
    cleanupInactiveSessions().catch((err) => {
      console.error("[Cleanup] Failed:", err);
    });
  }, 24 * 60 * 60 * 1000);
}