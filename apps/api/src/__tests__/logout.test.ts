import { afterEach, describe, expect, it } from "bun:test";
import { DbAuthToken } from "../db/queries/auth-token";
import { TwitchAuth } from "../services/twitch-auth";

const USER_ID = "logout-test-user";
const SESSION_ID = "logout-test-session";

afterEach(async () => {
  TwitchAuth.onSessionInvalidated = null;
  await DbAuthToken.deleteBySessionId(SESSION_ID);
});

describe("logout", () => {
  it("deletes the session and waits for its cleanup", async () => {
    await DbAuthToken.upsertByUserId({
      session_id: SESSION_ID,
      access_token: "test-access",
      refresh_token: "test-refresh",
      user_id: USER_ID,
      user_login: "logout-user",
      user_display_name: "Logout User",
      profile_image_url: "",
      expires_at: new Date(Date.now() + 60_000),
    });

    let cleanupContext: { userId: string; sessionId: string } | undefined;
    TwitchAuth.onSessionInvalidated = async (context) => {
      await Bun.sleep(10);
      cleanupContext = context;
    };

    await TwitchAuth.deleteToken(SESSION_ID);

    expect(await DbAuthToken.getBySessionId(SESSION_ID)).toBeUndefined();
    expect(cleanupContext).toEqual({ userId: USER_ID, sessionId: SESSION_ID });
  });
});
