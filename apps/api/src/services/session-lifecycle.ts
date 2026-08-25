import { getConnectionManager } from "./connection-manager";
import { removeUserPoll, resetUserPollingState } from "./polling";
import type { SessionInvalidationContext } from "./twitch-auth";

interface SessionResources {
  removePoll: (userId: string) => Promise<unknown>;
  resetPollingState: (userId: string) => void;
  closeConnection: (userId: string) => Promise<unknown>;
}

export function createSessionInvalidationHandler(resources: SessionResources) {
  return async ({ userId }: SessionInvalidationContext) => {
    resources.resetPollingState(userId);
    await Promise.all([resources.removePoll(userId), resources.closeConnection(userId)]);
  };
}

export const invalidateSessionResources = createSessionInvalidationHandler({
  removePoll: removeUserPoll,
  resetPollingState: resetUserPollingState,
  closeConnection: (userId) => getConnectionManager().close(userId),
});
