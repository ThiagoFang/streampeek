import { getConnectionManager } from "./connection-manager";
import { removeUserPoll, resetUserPollingState } from "./polling";
import type { SessionInvalidationContext } from "./twitch-auth";

interface SessionResources {
  removePoll: (userId: string) => Promise<unknown>;
  resetPollingState: (userId: string) => Promise<unknown>;
  closeConnection: (userId: string) => Promise<unknown>;
}

export function createSessionInvalidationHandler(resources: SessionResources) {
  return async ({ userId }: SessionInvalidationContext) => {
    await Promise.all([
      resources.resetPollingState(userId),
      resources.removePoll(userId),
      resources.closeConnection(userId),
    ]);
  };
}

export const invalidateSessionResources = createSessionInvalidationHandler({
  removePoll: removeUserPoll,
  resetPollingState: resetUserPollingState,
  closeConnection: (userId) => getConnectionManager().close(userId),
});
