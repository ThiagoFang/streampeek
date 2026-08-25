import { StreamerSchemas } from "../../schemas/streamer";
import type { FollowedChannel } from "./types";

const HELIX_URL = "https://api.twitch.tv/helix";
const TWITCH_BATCH_SIZE = 100;

interface TwitchRequest {
  url: string;
  headers: {
    Authorization: string;
    "Client-Id": string;
  };
}

export interface TwitchStreamerClientDependencies {
  clientId: string;
  request: (request: TwitchRequest) => Promise<unknown>;
}

export function createTwitchStreamerClient(dependencies: TwitchStreamerClientDependencies) {
  const headers = (accessToken: string) => ({
    Authorization: `Bearer ${accessToken}`,
    "Client-Id": dependencies.clientId,
  });

  const getByUserIds = async <T>(
    path: string,
    idParameter: "id" | "user_id",
    userIds: string[],
    accessToken: string,
    parse: (data: unknown) => T[],
    getId: (item: T) => string,
  ) => {
    const indexedItems: Record<string, T> = {};

    for (let start = 0; start < userIds.length; start += TWITCH_BATCH_SIZE) {
      const params = new URLSearchParams();
      for (const id of userIds.slice(start, start + TWITCH_BATCH_SIZE)) {
        params.append(idParameter, id);
      }

      const data = await dependencies.request({
        url: `${HELIX_URL}/${path}?${params}`,
        headers: headers(accessToken),
      });

      for (const item of parse(data)) {
        indexedItems[getId(item)] = item;
      }
    }

    return indexedItems;
  };

  return {
    async getFollowedChannels(userId: string, accessToken: string) {
      const channels: FollowedChannel[] = [];
      const seenCursors = new Set<string>();
      let cursor: string | undefined;

      do {
        const params = new URLSearchParams({ user_id: userId, first: "100" });
        if (cursor) params.set("after", cursor);

        const data = await dependencies.request({
          url: `${HELIX_URL}/channels/followed?${params}`,
          headers: headers(accessToken),
        });
        const response = StreamerSchemas.followedResponse.assert(data);

        channels.push(...response.data);
        cursor = response.pagination.cursor;
        if (cursor && seenCursors.has(cursor)) {
          throw new Error("Twitch returned a repeated pagination cursor");
        }
        if (cursor) seenCursors.add(cursor);
      } while (cursor);

      return channels;
    },

    getStreams(userIds: string[], accessToken: string) {
      return getByUserIds(
        "streams",
        "user_id",
        userIds,
        accessToken,
        (data) => StreamerSchemas.streamsResponse.assert(data).data,
        (stream) => stream.user_id,
      );
    },

    getUsers(userIds: string[], accessToken: string) {
      return getByUserIds(
        "users",
        "id",
        userIds,
        accessToken,
        (data) => StreamerSchemas.usersResponse.assert(data).data,
        (user) => user.id,
      );
    },
  };
}
