import { describe, expect, it } from "bun:test";
import type { Selectable } from "kysely";
import type { AuthToken } from "../db/generated/types";
import { createSessionResolver } from "../services/session-resolver";

type StoredAuthToken = Selectable<AuthToken>;

const NOW = new Date("2026-01-01T00:00:00.000Z");

function createToken(overrides: Partial<StoredAuthToken> = {}): StoredAuthToken {
  return {
    id: 1,
    session_id: "session-1",
    access_token: "access-1",
    refresh_token: "refresh-1",
    user_id: "user-1",
    user_login: "user",
    user_display_name: "User",
    profile_image_url: "",
    expires_at: new Date("2026-01-01T01:00:00.000Z"),
    created_at: new Date("2025-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function createTestResolver(
  getToken: () => StoredAuthToken | undefined,
  refreshToken: (token: StoredAuthToken) => Promise<unknown>,
) {
  return createSessionResolver({
    getBySessionId: async (sessionId) => {
      const token = getToken();
      return token?.session_id === sessionId ? token : undefined;
    },
    getByUserId: async (userId) => {
      const token = getToken();
      return token?.user_id === userId ? token : undefined;
    },
    refreshToken,
    now: () => NOW,
  });
}

describe("session resolver", () => {
  it("returns a valid session without renewing it", async () => {
    const token = createToken();
    let refreshCalls = 0;
    const resolver = createTestResolver(
      () => token,
      async () => {
        refreshCalls += 1;
      },
    );

    expect(await resolver.bySessionId(token.session_id)).toBe(token);
    expect(refreshCalls).toBe(0);
  });

  it("renews an expired session and returns the saved token", async () => {
    let token = createToken({ expires_at: new Date("2025-12-31T23:00:00.000Z") });
    const resolver = createTestResolver(
      () => token,
      async () => {
        token = createToken({
          access_token: "renewed-access",
          expires_at: new Date("2026-01-01T01:00:00.000Z"),
        });
      },
    );

    const resolved = await resolver.byUserId(token.user_id);

    expect(resolved?.access_token).toBe("renewed-access");
  });

  it("rejects the session when renewal fails", async () => {
    const token = createToken({ expires_at: new Date("2025-12-31T23:00:00.000Z") });
    const resolver = createTestResolver(
      () => token,
      async () => {
        throw new Error("Twitch unavailable");
      },
    );

    expect(await resolver.bySessionId(token.session_id)).toBeNull();
  });

  it("rejects a renewal that was not saved as a valid token", async () => {
    const token = createToken({ expires_at: new Date("2025-12-31T23:00:00.000Z") });
    const resolver = createTestResolver(
      () => token,
      async () => undefined,
    );

    expect(await resolver.bySessionId(token.session_id)).toBeNull();
  });

  it("rejects a session revoked while it was being renewed", async () => {
    let token: StoredAuthToken | undefined = createToken({
      expires_at: new Date("2025-12-31T23:00:00.000Z"),
    });
    const resolver = createTestResolver(
      () => token,
      async () => {
        token = undefined;
      },
    );

    expect(await resolver.bySessionId("session-1")).toBeNull();
  });

  it("shares one renewal between simultaneous requests", async () => {
    let token = createToken({ expires_at: new Date("2025-12-31T23:00:00.000Z") });
    let refreshCalls = 0;
    let finishRefresh!: () => void;
    const refreshFinished = new Promise<void>((resolve) => {
      finishRefresh = resolve;
    });
    const resolver = createTestResolver(
      () => token,
      async () => {
        refreshCalls += 1;
        await refreshFinished;
        token = createToken({ access_token: "shared-access" });
      },
    );

    const bySession = resolver.bySessionId(token.session_id);
    const byUser = resolver.byUserId(token.user_id);
    await Bun.sleep(0);

    expect(refreshCalls).toBe(1);
    finishRefresh();

    const [first, second] = await Promise.all([bySession, byUser]);
    expect(first?.access_token).toBe("shared-access");
    expect(second?.access_token).toBe("shared-access");
  });
});
