import type { Streamer } from "@/types/streamer";

export function groupStreamers(streamers: readonly Streamer[]) {
  const live = streamers
    .filter((streamer) => streamer.isLive)
    .sort((first, second) => second.viewerCount - first.viewerCount);
  const offline = streamers
    .filter((streamer) => !streamer.isLive)
    .sort((first, second) => first.displayName.localeCompare(second.displayName));

  return { live, offline };
}
