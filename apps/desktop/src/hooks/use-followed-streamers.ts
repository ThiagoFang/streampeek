import { orpc } from "@/lib/orpc";
import { useSuspenseQuery } from "@tanstack/react-query";

function useFollowedStreamers() {
  return useSuspenseQuery(orpc.streamer.getFollowed.queryOptions());
}

export { useFollowedStreamers };
