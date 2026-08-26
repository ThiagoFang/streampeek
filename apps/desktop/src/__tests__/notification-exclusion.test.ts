import { describe, expect, it } from "bun:test";
import { createNotificationExclusion, getMutedStreamerIds } from "../lib/notification-exclusion";
import type { Streamer } from "../types/streamer";

const streamer: Streamer = {
  id: "streamer-id",
  channelSlug: "streamer_login",
  displayName: "Streamer Name",
  profileImageUrl: "",
  isLive: true,
  viewerCount: 100,
  gameName: "Game",
  thumbnailUrl: "",
  startedAt: "",
};

describe("notification exclusions", () => {
  it("indexes muted streamers by their Twitch id", () => {
    const ids = getMutedStreamerIds([{ broadcaster_id: "first" }, { broadcaster_id: "second" }]);

    expect(ids.has("first")).toBe(true);
    expect(ids.has("second")).toBe(true);
    expect(ids.has("third")).toBe(false);
  });

  it("creates the backend input from the visible streamer", () => {
    expect(createNotificationExclusion(streamer)).toEqual({
      broadcaster_id: "streamer-id",
      broadcaster_login: "streamer_login",
      broadcaster_name: "Streamer Name",
    });
  });
});
