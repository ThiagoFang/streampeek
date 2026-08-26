import type { FollowedChannel, StreamSnapshot, TwitchUser } from "./types";

export interface StreamerServiceDependencies {
  getFollowedChannels: (userId: string, accessToken: string) => Promise<FollowedChannel[]>;
  getStreams: (userIds: string[], accessToken: string) => Promise<Record<string, StreamSnapshot>>;
  getUsers: (userIds: string[], accessToken: string) => Promise<Record<string, TwitchUser>>;
}

export function createStreamerService(dependencies: StreamerServiceDependencies) {
  return {
    async getFollowed(userId: string, accessToken: string) {
      const channels = await dependencies.getFollowedChannels(userId, accessToken);
      if (!channels.length) return [];

      const userIds = channels.map((channel) => channel.broadcaster_id);
      const [streams, users] = await Promise.all([
        dependencies.getStreams(userIds, accessToken),
        dependencies.getUsers(userIds, accessToken),
      ]);

      return channels.map((channel) => {
        const stream = streams[channel.broadcaster_id];
        const user = users[channel.broadcaster_id];

        return {
          id: channel.broadcaster_id,
          channelSlug: channel.broadcaster_login,
          displayName: channel.broadcaster_name,
          profileImageUrl: user?.profile_image_url ?? "",
          isLive: Boolean(stream),
          viewerCount: stream?.viewer_count ?? 0,
          gameName: stream?.game_name ?? "",
          thumbnailUrl: stream?.thumbnail_url ?? "",
          startedAt: stream?.started_at ?? "",
        };
      });
    },
  };
}
