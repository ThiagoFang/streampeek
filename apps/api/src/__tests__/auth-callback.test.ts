import { describe, expect, it } from "bun:test";
import {
  createAuthCallbackService,
  type AuthCallbackDependencies,
} from "../services/auth-callback";

const TOKEN = {
  access_token: "access-token",
  refresh_token: "refresh-token",
  expires_in: 3600,
  token_type: "bearer",
  scope: ["user:read:follows"],
};

const USER = {
  id: "user-1",
  login: "streamer",
  display_name: "Streamer",
  profile_image_url: "https://example.com/profile.png",
};

function createHarness(overrides: Partial<AuthCallbackDependencies> = {}) {
  const calls: string[] = [];

  const dependencies: AuthCallbackDependencies = {
    acceptAuthorization: async () => {
      calls.push("accept authorization");
      return true;
    },
    exchangeCode: async () => {
      calls.push("exchange code");
      return TOKEN;
    },
    getUser: async () => {
      calls.push("get user");
      return USER;
    },
    createSession: async () => {
      calls.push("create session");
      return "session-1";
    },
    deleteSession: async () => {
      calls.push("delete session");
    },
    schedulePolling: async () => {
      calls.push("schedule polling");
    },
    publishSession: async () => {
      calls.push("publish session");
      return true;
    },
    ...overrides,
  };

  return { service: createAuthCallbackService(dependencies), calls };
}

describe("authentication callback", () => {
  it("rejects an authorization state that was not reserved", async () => {
    const harness = createHarness({ acceptAuthorization: async () => false });

    expect(await harness.service.complete("code", "invalid-state")).toEqual({
      completed: false,
    });
    expect(harness.calls).toEqual([]);
  });

  it("completes the login steps in dependency order", async () => {
    const harness = createHarness();

    expect(await harness.service.complete("code", "state")).toEqual({ completed: true });
    expect(harness.calls).toEqual([
      "accept authorization",
      "exchange code",
      "get user",
      "create session",
      "schedule polling",
      "publish session",
    ]);
  });

  it("does not delete a session that was never created", async () => {
    const twitchError = new Error("Twitch unavailable");
    const harness = createHarness({
      exchangeCode: async () => {
        throw twitchError;
      },
    });

    expect(harness.service.complete("code", "state")).rejects.toBe(twitchError);
    expect(harness.calls).toEqual(["accept authorization"]);
  });

  it("deletes a created session when polling setup fails", async () => {
    const pollingError = new Error("queue unavailable");
    const harness = createHarness({
      schedulePolling: async () => {
        throw pollingError;
      },
    });

    expect(harness.service.complete("code", "state")).rejects.toBe(pollingError);
    expect(harness.calls).toEqual([
      "accept authorization",
      "exchange code",
      "get user",
      "create session",
      "delete session",
    ]);
  });

  it("deletes a created session when publishing the result fails", async () => {
    const publishError = new Error("Redis unavailable");
    const harness = createHarness({
      publishSession: async () => {
        throw publishError;
      },
    });

    expect(harness.service.complete("code", "state")).rejects.toBe(publishError);
    expect(harness.calls).toEqual([
      "accept authorization",
      "exchange code",
      "get user",
      "create session",
      "schedule polling",
      "delete session",
    ]);
  });

  it("deletes a created session when the user canceled during the callback", async () => {
    const harness = createHarness({
      publishSession: async () => {
        harness.calls.push("publish session");
        return false;
      },
    });

    expect(await harness.service.complete("code", "state")).toEqual({ completed: false });
    expect(harness.calls).toEqual([
      "accept authorization",
      "exchange code",
      "get user",
      "create session",
      "schedule polling",
      "publish session",
      "delete session",
    ]);
  });

  it("preserves both errors when the operation and rollback fail", async () => {
    const publishError = new Error("Redis unavailable");
    const rollbackError = new Error("database unavailable");
    const harness = createHarness({
      publishSession: async () => {
        throw publishError;
      },
      deleteSession: async () => {
        throw rollbackError;
      },
    });

    try {
      await harness.service.complete("code", "state");
      throw new Error("Expected authentication callback to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(AggregateError);
      expect((error as AggregateError).errors).toEqual([publishError, rollbackError]);
    }
  });
});
