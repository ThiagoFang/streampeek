import { describe, expect, it } from "bun:test";
import {
  createAuthSessionService,
  type SessionInvalidationContext,
  type SessionIdentity,
  type StoredSession,
} from "../services/auth-session";

const NOW = Date.UTC(2026, 0, 1);
const SESSION_ID = "new-session";
const TOKEN_DATA = {
  access_token: "new-access",
  refresh_token: "new-refresh",
  token_type: "bearer",
  expires_in: 3600,
};
const USER = {
  id: "user-1",
  login: "streamer",
  display_name: "Streamer",
  profile_image_url: "https://example.com/avatar.png",
};

function createHarness({
  sessionByUser,
  sessionById,
}: {
  sessionByUser?: SessionIdentity;
  sessionById?: SessionIdentity;
} = {}) {
  const calls: string[] = [];
  const invalidations: SessionInvalidationContext[] = [];
  let savedSession: StoredSession | undefined;

  const service = createAuthSessionService({
    findByUserId: async () => sessionByUser,
    findBySessionId: async () => sessionById,
    saveByUserId: async (session) => {
      calls.push(`save:${session.session_id}`);
      savedSession = session;
    },
    deleteBySessionId: async (sessionId) => {
      calls.push(`delete:${sessionId}`);
    },
    invalidateSession: async (context) => {
      invalidations.push(context);
      calls.push(`invalidate:${context.sessionId}`);
    },
    createSessionId: () => SESSION_ID,
    now: () => NOW,
  });

  return { service, calls, invalidations, getSavedSession: () => savedSession };
}

describe("auth session", () => {
  it("creates and stores a session with the correct expiration", async () => {
    const harness = createHarness();

    const sessionId = await harness.service.create(TOKEN_DATA, USER);

    expect(sessionId).toBe(SESSION_ID);
    expect(harness.getSavedSession()).toEqual({
      session_id: SESSION_ID,
      access_token: TOKEN_DATA.access_token,
      refresh_token: TOKEN_DATA.refresh_token,
      user_id: USER.id,
      user_login: USER.login,
      user_display_name: USER.display_name,
      profile_image_url: USER.profile_image_url,
      expires_at: new Date(NOW + TOKEN_DATA.expires_in * 1000),
    });
    expect(harness.calls).toEqual([`save:${SESSION_ID}`]);
  });

  it("invalidates the previous session after storing its replacement", async () => {
    const previousSession = { user_id: USER.id, session_id: "old-session" };
    const harness = createHarness({ sessionByUser: previousSession });

    await harness.service.create(TOKEN_DATA, USER);

    expect(harness.calls).toEqual([
      `save:${SESSION_ID}`,
      `invalidate:${previousSession.session_id}`,
    ]);
    expect(harness.invalidations).toEqual([
      { userId: previousSession.user_id, sessionId: previousSession.session_id },
    ]);
  });

  it("deletes an existing session before invalidating its resources", async () => {
    const existingSession = { user_id: USER.id, session_id: "existing-session" };
    const harness = createHarness({ sessionById: existingSession });

    await harness.service.delete(existingSession.session_id);

    expect(harness.calls).toEqual([
      `delete:${existingSession.session_id}`,
      `invalidate:${existingSession.session_id}`,
    ]);
    expect(harness.invalidations).toEqual([
      { userId: existingSession.user_id, sessionId: existingSession.session_id },
    ]);
  });

  it("does not invalidate resources when the session no longer exists", async () => {
    const harness = createHarness();

    await harness.service.delete("missing-session");

    expect(harness.calls).toEqual(["delete:missing-session"]);
  });
});
