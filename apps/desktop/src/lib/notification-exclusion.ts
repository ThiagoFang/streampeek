import type { Streamer } from "@/types/streamer";

interface NotificationExclusion {
  broadcaster_id: string;
}

export function getMutedStreamerIds(exclusions: readonly NotificationExclusion[]) {
  return new Set(exclusions.map((exclusion) => exclusion.broadcaster_id));
}

export function createNotificationExclusion(streamer: Streamer) {
  return {
    broadcaster_id: streamer.id,
    broadcaster_login: streamer.channelSlug,
    broadcaster_name: streamer.displayName,
  };
}
