import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  sendNotification,
  isPermissionGranted,
  requestPermission,
} from "@tauri-apps/plugin-notification";
import { orpc } from "@/lib/orpc";
import { useSessionStore } from "@/store/session";
import { useSettingsStore } from "@/store/settings";
import { envVariables } from "@/lib/env";

export function useStreamEvents() {
  const sessionId = useSessionStore((s) => s.sessionId);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!sessionId) return;

    const eventSource = new EventSource(
      `${envVariables.VITE_API_BASE_URL}/events?session=${sessionId}`,
    );

    eventSource.onmessage = async (e) => {
      let event: { type: string; broadcasterUserName?: string };
      try {
        event = JSON.parse(e.data);
      } catch {
        return;
      }

      if (event.type === "stream.online") {
        const enabled = useSettingsStore.getState().notificationsEnabled;
        if (enabled) {
          let granted = await isPermissionGranted();
          if (!granted) {
            const permission = await requestPermission();
            granted = permission === "granted";
          }
          if (granted) {
            sendNotification({
              title: "StreamPeek",
              body: `${event.broadcasterUserName} acabou de entrar ao vivo!`,
            });
          }
        }
      }

      queryClient.invalidateQueries({
        queryKey: orpc.streamer.getFollowed.queryOptions().queryKey,
      });
    };

    return () => eventSource.close();
  }, [sessionId, queryClient]);
}
