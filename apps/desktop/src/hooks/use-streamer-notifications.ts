import { useMemo, useState } from "react";
import { createNotificationExclusion, getMutedStreamerIds } from "@/lib/notification-exclusion";
import type { Streamer } from "@/types/streamer";
import { useAddExclusion, useExclusionList, useRemoveExclusion } from "./use-exclusion-list";

export function useStreamerNotifications() {
  const exclusions = useExclusionList();
  const mutedStreamerIds = useMemo(() => getMutedStreamerIds(exclusions), [exclusions]);
  const [pendingStates, setPendingStates] = useState<Record<string, boolean>>({});
  const addExclusion = useAddExclusion();
  const removeExclusion = useRemoveExclusion();

  const isMuted = (streamerId: string) =>
    pendingStates[streamerId] ?? mutedStreamerIds.has(streamerId);

  const toggleMuted = async (streamer: Streamer) => {
    const nextMutedState = !isMuted(streamer.id);
    setPendingStates((current) => ({ ...current, [streamer.id]: nextMutedState }));

    try {
      if (nextMutedState) {
        await addExclusion.mutateAsync(createNotificationExclusion(streamer));
      } else {
        await removeExclusion.mutateAsync({ broadcaster_id: streamer.id });
      }
    } finally {
      setPendingStates((current) => {
        const next = { ...current };
        delete next[streamer.id];
        return next;
      });
    }
  };

  return {
    isMuted,
    isUpdating: (streamerId: string) => streamerId in pendingStates,
    toggleMuted,
  };
}
