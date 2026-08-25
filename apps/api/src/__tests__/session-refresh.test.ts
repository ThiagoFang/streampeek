import { describe, expect, it } from "bun:test";
import { createSessionRefresher, type StoredCredentials } from "../services/session-refresh";

const NOW = Date.UTC(2026, 0, 1);
const SESSION = { session_id: "session-1", refresh_token: "old-refresh" };
const REFRESHED = {
  access_token: "new-access",
  refresh_token: "new-refresh",
  expires_in: 3600,
};

function createHarness() {
  const requests: string[] = [];
  const updates: Array<{ sessionId: string; credentials: StoredCredentials }> = [];
  let requestFailure: Error | undefined;

  const refresher = createSessionRefresher({
    requestCredentials: async (refreshToken) => {
      requests.push(refreshToken);
      if (requestFailure) throw requestFailure;
      return REFRESHED;
    },
    updateCredentials: async (sessionId, credentials) => {
      updates.push({ sessionId, credentials });
    },
    now: () => NOW,
  });

  return {
    refresher,
    requests,
    updates,
    failRequestWith: (error: Error) => {
      requestFailure = error;
    },
  };
}

describe("session refresher", () => {
  it("requests and stores fresh credentials with their new expiration", async () => {
    const harness = createHarness();

    await harness.refresher.refresh(SESSION);

    expect(harness.requests).toEqual([SESSION.refresh_token]);
    expect(harness.updates).toEqual([
      {
        sessionId: SESSION.session_id,
        credentials: {
          access_token: REFRESHED.access_token,
          refresh_token: REFRESHED.refresh_token,
          expires_at: new Date(NOW + REFRESHED.expires_in * 1000),
        },
      },
    ]);
  });

  it("does not change stored credentials when Twitch rejects the refresh", async () => {
    const harness = createHarness();
    harness.failRequestWith(new Error("Twitch unavailable"));

    await expect(harness.refresher.refresh(SESSION)).rejects.toThrow("Twitch unavailable");

    expect(harness.updates).toEqual([]);
  });
});
