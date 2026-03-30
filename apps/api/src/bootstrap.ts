import { createPollWorker } from "./services/poll-worker";
import { startCleanupJob } from "./services/session-cleanup";
import { getConnectionManager } from "./services/connection-manager";
import { TwitchAuth } from "./services/twitch-auth";
import { DbAuthToken } from "./db/queries/auth-token";
import { removeUserPoll } from "./services/poll-worker";

export async function initializeApp() {
  createPollWorker();

  getConnectionManager();

  TwitchAuth.onLogout = async (userId) => {
    const tokens = await DbAuthToken.getAll();
    const token = tokens.find((t) => t.user_id === userId);
    if (token) {
      await removeUserPoll(token.session_id);
    }
  };

  await scheduleExistingPolls();

  startCleanupJob();

  console.log("[Bootstrap] Application initialized");
}

async function scheduleExistingPolls() {
  const tokens = await DbAuthToken.getAll();
  for (const token of tokens) {
    const { scheduleUserPoll } = await import("./services/poll-worker");
    await scheduleUserPoll(token.session_id);
  }
  console.log(`[Bootstrap] Scheduled ${tokens.length} poll jobs`);
}