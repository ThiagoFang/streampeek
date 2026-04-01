import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { onAction } from "@tauri-apps/plugin-notification";
import { openTwitchChannel } from "@/lib/twitch";
import { orpc } from "@/lib/orpc";
import { useSessionStore } from "@/store/session";
import { envVariables } from "@/lib/env";

export function useStreamEvents() {
  const sessionId = useSessionStore((s) => s.sessionId);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!sessionId) return;

    invoke("start_sse", {
      sessionId,
      apiBaseUrl: envVariables.VITE_API_BASE_URL,
    });

    const invalidate = () =>
      queryClient.invalidateQueries({
        queryKey: orpc.streamer.getFollowed.queryOptions().queryKey,
      });

    const unlistenOnline = listen("streamer-online", invalidate);
    const unlistenOffline = listen("streamer-offline", invalidate);

    const actionCleanup = onAction((notification) => {
      const login = (notification.extra as Record<string, string>)?.login;
      if (login) openTwitchChannel(login);
    });

    return () => {
      invoke("stop_sse");
      unlistenOnline.then((fn) => fn());
      unlistenOffline.then((fn) => fn());
      actionCleanup.then((listener) => listener.unregister());
    };
  }, [sessionId, queryClient]);
}
