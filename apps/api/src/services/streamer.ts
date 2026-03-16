import axios from "redaxios";
import { envVariables } from "../lib/env";
import { StreamerSchemas } from "../schemas/streamer";

const HELIX = "https://api.twitch.tv/helix";

function helixHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Client-Id": envVariables.TWITCH_CLIENT_ID,
  };
}

export const TwitchStreamer = {
  async getFollowedChannels(userId: string, accessToken: string) {
    const allChannels: typeof StreamerSchemas.followedResponse.infer.data = [];
    let cursor: string | undefined;

    do {
      const params = new URLSearchParams({
        user_id: userId,
        first: "100",
      });
      if (cursor) params.set("after", cursor);

      const { data } = await axios<unknown>({
        method: "GET",
        url: `${HELIX}/channels/followed?${params}`,
        headers: helixHeaders(accessToken),
      });

      const validated = StreamerSchemas.followedResponse.assert(data);
      allChannels.push(...validated.data);
      cursor = validated.pagination.cursor;
    } while (cursor);

    return allChannels;
  },

  async getStreams(userIds: string[], accessToken: string) {
    if (userIds.length === 0) return {};

    const streams: Record<
      string,
      typeof StreamerSchemas.streamsResponse.infer.data[number]
    > = {};

    for (let i = 0; i < userIds.length; i += 100) {
      const batch = userIds.slice(i, i + 100);
      const params = new URLSearchParams();
      for (const id of batch) params.append("user_id", id);

      const { data } = await axios<unknown>({
        method: "GET",
        url: `${HELIX}/streams?${params}`,
        headers: helixHeaders(accessToken),
      });

      const validated = StreamerSchemas.streamsResponse.assert(data);

      for (const stream of validated.data) {
        streams[stream.user_id] = stream;
      }
    }

    return streams;
  },

  async getFollowedStreamers(userId: string, accessToken: string) {
    const channels = await this.getFollowedChannels(userId, accessToken);
    const userIds = channels.map((c) => c.broadcaster_id);
    const streams = await this.getStreams(userIds, accessToken);

    return channels.map((channel) => {
      const stream = streams[channel.broadcaster_id];
      return {
        id: channel.broadcaster_id,
        displayName: channel.broadcaster_name,
        isLive: !!stream,
        viewerCount: stream?.viewer_count ?? 0,
        gameName: stream?.game_name ?? "",
        thumbnailUrl: stream?.thumbnail_url ?? "",
        startedAt: stream?.started_at ?? "",
      };
    });
  },
};
