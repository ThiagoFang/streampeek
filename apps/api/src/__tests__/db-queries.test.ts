import { describe, it, expect, beforeEach, afterAll } from "bun:test";
import { DbAuthToken } from "../db/queries/auth-token";
import { DbUserSettings } from "../db/queries/user-settings";
import { DbNotificationExclusion } from "../db/queries/notification-exclusion";
import { db } from "../db";

const TEST_USER_ID = "test-user-999";
const TEST_SESSION_ID = "test-session-999";

async function cleanupTestData() {
  await db.deleteFrom("notification_exclusions").where("user_id", "=", TEST_USER_ID).execute();
  await db.deleteFrom("user_settings").where("user_id", "=", TEST_USER_ID).execute();
  await db.deleteFrom("auth_tokens").where("user_id", "=", TEST_USER_ID).execute();
}

describe("DbAuthToken", () => {
  beforeEach(cleanupTestData);
  afterAll(cleanupTestData);

  const tokenData = {
    session_id: TEST_SESSION_ID,
    access_token: "test-access",
    refresh_token: "test-refresh",
    user_id: TEST_USER_ID,
    user_login: "testuser",
    user_display_name: "TestUser",
    profile_image_url: "https://example.com/pic.jpg",
    expires_at: new Date(Date.now() + 3600_000),
  };

  it("upserts and retrieves by session id", async () => {
    await DbAuthToken.upsertByUserId(tokenData);

    const token = await DbAuthToken.getBySessionId(TEST_SESSION_ID);
    expect(token).not.toBeNull();
    expect(token!.user_id).toBe(TEST_USER_ID);
    expect(token!.user_login).toBe("testuser");
  });

  it("retrieves by user id", async () => {
    await DbAuthToken.upsertByUserId(tokenData);

    const token = await DbAuthToken.getByUserId(TEST_USER_ID);
    expect(token).not.toBeNull();
    expect(token!.session_id).toBe(TEST_SESSION_ID);
  });

  it("upsert overwrites existing token for same user", async () => {
    await DbAuthToken.upsertByUserId(tokenData);
    await DbAuthToken.upsertByUserId({
      ...tokenData,
      session_id: "new-session",
      access_token: "new-access",
    });

    const token = await DbAuthToken.getByUserId(TEST_USER_ID);
    expect(token!.session_id).toBe("new-session");
    expect(token!.access_token).toBe("new-access");
  });

  it("updates tokens", async () => {
    await DbAuthToken.upsertByUserId(tokenData);

    const newExpiry = new Date(Date.now() + 7200_000);
    await DbAuthToken.updateTokens(TEST_SESSION_ID, {
      access_token: "updated-access",
      refresh_token: "updated-refresh",
      expires_at: newExpiry,
    });

    const token = await DbAuthToken.getBySessionId(TEST_SESSION_ID);
    expect(token!.access_token).toBe("updated-access");
    expect(token!.refresh_token).toBe("updated-refresh");
  });

  it("deletes by session id", async () => {
    await DbAuthToken.upsertByUserId(tokenData);
    await DbAuthToken.deleteBySessionId(TEST_SESSION_ID);

    const token = await DbAuthToken.getBySessionId(TEST_SESSION_ID);
    expect(token).toBeUndefined();
  });

  it("getExpiredBefore returns only expired tokens", async () => {
    const expiredDate = new Date(Date.now() - 90 * 24 * 3600_000);
    await DbAuthToken.upsertByUserId({ ...tokenData, expires_at: expiredDate });

    const cutoff = new Date(Date.now() - 30 * 24 * 3600_000);
    const expired = await DbAuthToken.getExpiredBefore(cutoff);

    expect(expired.some((t) => t.user_id === TEST_USER_ID)).toBe(true);
  });

  it("getExpiredBefore does not return valid tokens", async () => {
    await DbAuthToken.upsertByUserId(tokenData);

    const cutoff = new Date(Date.now() - 30 * 24 * 3600_000);
    const expired = await DbAuthToken.getExpiredBefore(cutoff);

    expect(expired.some((t) => t.user_id === TEST_USER_ID)).toBe(false);
  });
});

describe("DbUserSettings", () => {
  beforeEach(async () => {
    await db.deleteFrom("user_settings").where("user_id", "=", TEST_USER_ID).execute();
  });
  afterAll(async () => {
    await db.deleteFrom("user_settings").where("user_id", "=", TEST_USER_ID).execute();
  });

  it("returns default when no settings exist", async () => {
    const settings = await DbUserSettings.getByUserId(TEST_USER_ID);
    expect(settings.notifications_enabled).toBe(true);
  });

  it("upserts and retrieves settings", async () => {
    await DbUserSettings.upsert(TEST_USER_ID, { notifications_enabled: false });

    const settings = await DbUserSettings.getByUserId(TEST_USER_ID);
    expect(settings.notifications_enabled).toBe(false);
  });

  it("updates existing settings", async () => {
    await DbUserSettings.upsert(TEST_USER_ID, { notifications_enabled: false });
    await DbUserSettings.upsert(TEST_USER_ID, { notifications_enabled: true });

    const settings = await DbUserSettings.getByUserId(TEST_USER_ID);
    expect(settings.notifications_enabled).toBe(true);
  });
});

describe("DbNotificationExclusion", () => {
  beforeEach(async () => {
    await db.deleteFrom("notification_exclusions").where("user_id", "=", TEST_USER_ID).execute();
  });
  afterAll(async () => {
    await db.deleteFrom("notification_exclusions").where("user_id", "=", TEST_USER_ID).execute();
  });

  it("adds and lists exclusions", async () => {
    await DbNotificationExclusion.add(TEST_USER_ID, {
      broadcaster_id: "123",
      broadcaster_login: "streamer1",
      broadcaster_name: "Streamer1",
    });

    const list = await DbNotificationExclusion.listByUserId(TEST_USER_ID);
    expect(list).toHaveLength(1);
    expect(list[0].broadcaster_id).toBe("123");
  });

  it("does not duplicate on conflict", async () => {
    const data = {
      broadcaster_id: "123",
      broadcaster_login: "streamer1",
      broadcaster_name: "Streamer1",
    };

    await DbNotificationExclusion.add(TEST_USER_ID, data);
    await DbNotificationExclusion.add(TEST_USER_ID, data);

    const list = await DbNotificationExclusion.listByUserId(TEST_USER_ID);
    expect(list).toHaveLength(1);
  });

  it("removes exclusion", async () => {
    await DbNotificationExclusion.add(TEST_USER_ID, {
      broadcaster_id: "123",
      broadcaster_login: "streamer1",
      broadcaster_name: "Streamer1",
    });

    await DbNotificationExclusion.remove(TEST_USER_ID, "123");

    const list = await DbNotificationExclusion.listByUserId(TEST_USER_ID);
    expect(list).toHaveLength(0);
  });

  it("isExcluded returns true for excluded broadcaster", async () => {
    await DbNotificationExclusion.add(TEST_USER_ID, {
      broadcaster_id: "123",
      broadcaster_login: "streamer1",
      broadcaster_name: "Streamer1",
    });

    expect(await DbNotificationExclusion.isExcluded(TEST_USER_ID, "123")).toBe(true);
  });

  it("isExcluded returns false for non-excluded broadcaster", async () => {
    expect(await DbNotificationExclusion.isExcluded(TEST_USER_ID, "999")).toBe(false);
  });
});
