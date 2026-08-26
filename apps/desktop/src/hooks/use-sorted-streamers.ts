import { useFollowedStreamers } from "@/hooks/use-followed-streamers";
import { groupStreamers } from "@/lib/group-streamers";
import { useMemo } from "react";

export function useSortedStreamers() {
  const { data: streamers } = useFollowedStreamers();

  return useMemo(() => groupStreamers(streamers), [streamers]);
}
