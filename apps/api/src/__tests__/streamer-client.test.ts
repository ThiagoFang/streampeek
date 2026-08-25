import { describe, expect, it } from "bun:test";
import { createTwitchStreamerClient } from "../services/streamer/client";

const ACCESS_TOKEN = "access-token";
const CLIENT_ID = "client-id";

function followedChannel(id: string) {
  return {
    broadcaster_id: id,
    broadcaster_login: `login-${id}`,
    broadcaster_name: `Streamer ${id}`,
  };
}

function stream(id: string) {
  return {
    user_id: id,
    viewer_count: 100,
    game_name: "Game",
    thumbnail_url: "https://example.com/thumbnail.jpg",
    started_at: "2026-01-01T00:00:00Z",
  };
}

describe("Twitch streamer client", () => {
  it("loads every page of followed channels", async () => {
    const requests: Array<{ url: string; headers: Record<string, string> }> = [];
    const responses = [
      { data: [followedChannel("1")], pagination: { cursor: "next-page" } },
      { data: [followedChannel("2")], pagination: {} },
    ];
    const client = createTwitchStreamerClient({
      clientId: CLIENT_ID,
      request: async (request) => {
        requests.push(request);
        return responses.shift();
      },
    });

    const channels = await client.getFollowedChannels("user-1", ACCESS_TOKEN);

    expect(channels).toEqual([followedChannel("1"), followedChannel("2")]);
    expect(requests).toHaveLength(2);
    expect(new URL(requests[1]!.url).searchParams.get("after")).toBe("next-page");
    expect(requests[0]!.headers).toEqual({
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Client-Id": CLIENT_ID,
    });
  });

  it("rejects a repeated cursor instead of polling the same page forever", async () => {
    const client = createTwitchStreamerClient({
      clientId: CLIENT_ID,
      request: async () => ({ data: [], pagination: { cursor: "repeated" } }),
    });

    await expect(client.getFollowedChannels("user-1", ACCESS_TOKEN)).rejects.toThrow(
      "repeated pagination cursor",
    );
  });

  it("splits stream lookups into Twitch-sized batches", async () => {
    const batchSizes: number[] = [];
    const client = createTwitchStreamerClient({
      clientId: CLIENT_ID,
      request: async (request) => {
        const ids = new URL(request.url).searchParams.getAll("user_id");
        batchSizes.push(ids.length);
        return { data: ids.map(stream) };
      },
    });
    const userIds = Array.from({ length: 205 }, (_, index) => String(index + 1));

    const streams = await client.getStreams(userIds, ACCESS_TOKEN);

    expect(batchSizes).toEqual([100, 100, 5]);
    expect(Object.keys(streams)).toHaveLength(205);
    expect(streams["205"]).toEqual(stream("205"));
  });

  it("does not contact Twitch for an empty user list", async () => {
    let requestCount = 0;
    const client = createTwitchStreamerClient({
      clientId: CLIENT_ID,
      request: async () => {
        requestCount += 1;
        return { data: [] };
      },
    });

    expect(await client.getUsers([], ACCESS_TOKEN)).toEqual({});
    expect(requestCount).toBe(0);
  });

  it("uses Twitch's id parameter when loading user profiles", async () => {
    let requestedUrl = "";
    const client = createTwitchStreamerClient({
      clientId: CLIENT_ID,
      request: async (request) => {
        requestedUrl = request.url;
        return { data: [{ id: "user-1", profile_image_url: "https://example.com/avatar.jpg" }] };
      },
    });

    await client.getUsers(["user-1"], ACCESS_TOKEN);

    const params = new URL(requestedUrl).searchParams;
    expect(params.getAll("id")).toEqual(["user-1"]);
    expect(params.has("user_id")).toBe(false);
  });
});
