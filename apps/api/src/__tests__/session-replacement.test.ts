import { afterEach, describe, expect, it } from "bun:test";
import { DbAuthToken } from "../db/queries/auth-token";
import { TwitchAuth } from "../services/twitch-auth";

const USER_ID = `replacement-user-${crypto.randomUUID()}`;
const OLD_SESSION_ID = `old-session-${crypto.randomUUID()}`;

afterEach(async () => {
  TwitchAuth.onSessionInvalidated = null;
  const token = await DbAuthToken.getByUserId(USER_ID);
  if (token) await DbAuthToken.deleteBySessionId(token.session_id);
});

describe("session replacement", () => {
  it("invalidates the previous session before returning the new one", async () => {
    await DbAuthToken.upsertByUserId({
      session_id: OLD_SESSION_ID,
      access_token: "old-access",
      refresh_token: "old-refresh",
      user_id: USER_ID,
      user_login: "replacement-user",
      user_display_name: "Replacement User",
      profile_image_url: "",
      expires_at: new Date(Date.now() + 60_000),
    });

    let invalidatedSession: string | undefined;
    TwitchAuth.onSessionInvalidated = async ({ sessionId }) => {
      invalidatedSession = sessionId;
    };

    const newSessionId = await TwitchAuth.saveToken(
      {
        access_token: "new-access",
        refresh_token: "new-refresh",
        token_type: "bearer",
        expires_in: 3600,
      },
      {
        id: USER_ID,
        login: "replacement-user",
        display_name: "Replacement User",
        profile_image_url: "",
      },
    );

    expect(invalidatedSession).toBe(OLD_SESSION_ID);
    expect(newSessionId).not.toBe(OLD_SESSION_ID);
    expect(await DbAuthToken.getBySessionId(OLD_SESSION_ID)).toBeUndefined();
    expect((await DbAuthToken.getBySessionId(newSessionId))?.user_id).toBe(USER_ID);
  });
});
