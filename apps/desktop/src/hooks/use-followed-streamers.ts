import { queryKeys } from "@/api/query-keys";
import { streamerApi } from "@/api/streamer";
import { useSuspenseQuery } from "@tanstack/react-query";

function useFollowedStreamers() {
  return useSuspenseQuery({
    queryKey: queryKeys.streamers.followed,
    queryFn: streamerApi.getFollowed,
  });
}

export { useFollowedStreamers };
