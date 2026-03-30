import { useFollowedStreamers } from "@/hooks/use-followed-streamers";
import { useMemo } from "react";

export function useSortedStreamers() {
  const { data: streamers } = useFollowedStreamers();

  return useMemo(() => {
    const live = streamers.filter((s) => s.isLive).sort((a, b) => b.viewerCount - a.viewerCount);
    const offline = streamers
      .filter((s) => !s.isLive)
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
    return { live, offline };
  }, [streamers]);
}
