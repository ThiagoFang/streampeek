import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  isPermissionGranted,
  requestPermission,
  onAction,
} from "@tauri-apps/plugin-notification";
import { notify } from "@/lib/notify";
import { safeParse } from "@/lib/parse";
import { openTwitchChannel } from "@/lib/twitch";
import { orpc } from "@/lib/orpc";
import { useSessionStore } from "@/store/session";
import { useSettingsStore } from "@/store/settings";
import { envVariables } from "@/lib/env";

async function handleEvent(
  event: {
    type: string;
    broadcasterUserName?: string;
    broadcasterUserLogin?: string;
    gameName?: string;
  },
  queryClient: ReturnType<typeof useQueryClient>,
) {
  if (event.type === "stream.online") {
    const enabled = useSettingsStore.getState().notificationsEnabled;
    if (enabled) {
      let granted = await isPermissionGranted();
      if (!granted) {
        const permission = await requestPermission();
        granted = permission === "granted";
      }
      if (granted) {
        const body = event.gameName
          ? `Entrou ao vivo — ${event.gameName}`
          : "Entrou ao vivo!";
        notify({
          title: event.broadcasterUserName ?? "StreamPeek",
          body,
          extra: { login: event.broadcasterUserLogin ?? "" },
        });
      }
    }
  }

  queryClient.invalidateQueries({
    queryKey: orpc.streamer.getFollowed.queryOptions().queryKey,
  });
}

export function useStreamEvents() {
  const sessionId = useSessionStore((s) => s.sessionId);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!sessionId) return;

    const controller = new AbortController();
    let delay = 1000;

    async function connect() {
      const response = await fetch(
        `${envVariables.VITE_API_BASE_URL}/events`,
        {
          headers: { Authorization: `Session ${sessionId}` },
          signal: controller.signal,
        },
      );

      if (!response.ok || !response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop()!;

        for (const line of lines) {
          const dataMatch = line.match(/^data:\s*(.+)$/m);
          if (!dataMatch) continue;

          const event = safeParse(dataMatch[1]);
          if (!event) continue;

          delay = 1000;
          await handleEvent(event, queryClient);
        }
      }
    }

    async function connectWithBackoff() {
      while (!controller.signal.aborted) {
        await connect().catch(() => {});
        if (controller.signal.aborted) break;
        await new Promise((r) => setTimeout(r, delay));
        delay = Math.min(delay * 2, 30000);
      }
    }

    connectWithBackoff();

    const actionCleanup = onAction((notification) => {
      const login = (notification.extra as Record<string, string>)?.login;
      if (login) openTwitchChannel(login);
    });

    return () => {
      controller.abort();
      actionCleanup.then((listener) => listener.unregister());
    };
  }, [sessionId, queryClient]);
}
