import { describe, expect, it } from "bun:test";
import { groupStreamers } from "../lib/group-streamers";
import type { Streamer } from "../types/streamer";

function createStreamer(overrides: Partial<Streamer>): Streamer {
  return {
    id: "streamer-id",
    channelSlug: "streamer",
    displayName: "Streamer",
    profileImageUrl: "",
    isLive: false,
    viewerCount: 0,
    gameName: "",
    thumbnailUrl: "",
    startedAt: "",
    ...overrides,
  };
}

describe("streamer grouping", () => {
  it("orders live streamers by audience and offline streamers by name", () => {
    const streamers = [
      createStreamer({ id: "offline-z", displayName: "Zeta" }),
      createStreamer({ id: "live-small", isLive: true, viewerCount: 20 }),
      createStreamer({ id: "offline-a", displayName: "Alpha" }),
      createStreamer({ id: "live-large", isLive: true, viewerCount: 100 }),
    ];

    const result = groupStreamers(streamers);

    expect(result.live.map((streamer) => streamer.id)).toEqual(["live-large", "live-small"]);
    expect(result.offline.map((streamer) => streamer.id)).toEqual(["offline-a", "offline-z"]);
  });

  it("does not rearrange the original list", () => {
    const streamers = [
      createStreamer({ id: "first", isLive: true, viewerCount: 10 }),
      createStreamer({ id: "second", isLive: true, viewerCount: 20 }),
    ];

    groupStreamers(streamers);

    expect(streamers.map((streamer) => streamer.id)).toEqual(["first", "second"]);
  });
});
