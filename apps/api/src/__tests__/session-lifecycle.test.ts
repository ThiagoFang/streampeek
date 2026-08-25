import { describe, expect, it } from "bun:test";
import { createSessionInvalidationHandler } from "../services/session-lifecycle";

describe("session invalidation", () => {
  it("cleans every resource owned by the invalidated session", async () => {
    const calls: string[] = [];
    const invalidate = createSessionInvalidationHandler({
      removePoll: async (userId) => {
        await Bun.sleep(5);
        calls.push(`poll:${userId}`);
      },
      resetPollingState: (userId) => {
        calls.push(`state:${userId}`);
      },
      closeConnection: async (userId) => {
        await Bun.sleep(5);
        calls.push(`connection:${userId}`);
      },
    });

    await invalidate({ userId: "user-1", sessionId: "session-1" });

    expect(calls).toContain("state:user-1");
    expect(calls).toContain("poll:user-1");
    expect(calls).toContain("connection:user-1");
  });
});
