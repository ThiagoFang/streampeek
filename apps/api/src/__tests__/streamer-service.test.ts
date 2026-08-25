import { describe, expect, it } from "bun:test";
import { createStreamerService } from "../services/streamer/service";

const USER_ID = "user-1";
const ACCESS_TOKEN = "access-token";
const CHANNELS = [
  {
    broadcaster_id: "live-id",
    broadcaster_login: "live-streamer",
    broadcaster_name: "Live Streamer",
  },
  {
    broadcaster_id: "offline-id",
    broadcaster_login: "offline-streamer",
    broadcaster_name: "Offline Streamer",
  },
];

describe("streamer service", () => {
  it("combines followed channels, live streams and profiles for the desktop", async () => {
    const requestedIds: string[][] = [];
    const service = createStreamerService({
      getFollowedChannels: async () => CHANNELS,
      getStreams: async (ids) => {
        requestedIds.push(ids);
        return {
          "live-id": {
            user_id: "live-id",
            viewer_count: 1234,
            game_name: "Game",
            thumbnail_url: "https://example.com/live.jpg",
            started_at: "2026-01-01T00:00:00Z",
          },
        };
      },
      getUsers: async (ids) => {
        requestedIds.push(ids);
        return {
          "live-id": { id: "live-id", profile_image_url: "https://example.com/avatar.jpg" },
        };
      },
    });

    const streamers = await service.getFollowed(USER_ID, ACCESS_TOKEN);

    expect(requestedIds).toEqual([
      ["live-id", "offline-id"],
      ["live-id", "offline-id"],
    ]);
    expect(streamers).toEqual([
      {
        id: "live-id",
        displayName: "Live Streamer",
        profileImageUrl: "https://example.com/avatar.jpg",
        isLive: true,
        viewerCount: 1234,
        gameName: "Game",
        thumbnailUrl: "https://example.com/live.jpg",
        startedAt: "2026-01-01T00:00:00Z",
      },
      {
        id: "offline-id",
        displayName: "Offline Streamer",
        profileImageUrl: "",
        isLive: false,
        viewerCount: 0,
        gameName: "",
        thumbnailUrl: "",
        startedAt: "",
      },
    ]);
  });

  it("returns immediately when the user follows no channels", async () => {
    let detailRequests = 0;
    const service = createStreamerService({
      getFollowedChannels: async () => [],
      getStreams: async () => {
        detailRequests += 1;
        return {};
      },
      getUsers: async () => {
        detailRequests += 1;
        return {};
      },
    });

    expect(await service.getFollowed(USER_ID, ACCESS_TOKEN)).toEqual([]);
    expect(detailRequests).toBe(0);
  });
});
