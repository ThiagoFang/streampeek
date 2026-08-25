import { describe, expect, it } from "bun:test";
import { shouldNotify } from "../services/polling/notification-policy";
import type { StreamEvent } from "../services/polling/types";

const onlineEvent: StreamEvent = {
  type: "stream.online",
  broadcasterUserId: "1",
  broadcasterUserLogin: "alice",
  broadcasterUserName: "Alice",
  gameName: "Alice's game",
};

describe("notification policy", () => {
  it("allows an online notification when notifications are enabled", () => {
    expect(shouldNotify(onlineEvent, { notificationsEnabled: true, streamerExcluded: false })).toBe(
      true,
    );
  });

  it("blocks notifications when the user disabled them", () => {
    expect(
      shouldNotify(onlineEvent, { notificationsEnabled: false, streamerExcluded: false }),
    ).toBe(false);
  });

  it("blocks notifications for an excluded streamer", () => {
    expect(shouldNotify(onlineEvent, { notificationsEnabled: true, streamerExcluded: true })).toBe(
      false,
    );
  });

  it("never shows a system notification for an offline event", () => {
    expect(
      shouldNotify(
        { ...onlineEvent, type: "stream.offline" },
        { notificationsEnabled: true, streamerExcluded: false },
      ),
    ).toBe(false);
  });
});
