import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { listen } from "@tauri-apps/api/event";
import { onAction } from "@tauri-apps/plugin-notification";
import { envVariables } from "@/lib/env";
import { orpc } from "@/lib/orpc";
import { SseController } from "@/lib/sse-controller";
import { openTwitchChannel } from "@/lib/twitch";
import { useSessionStore } from "@/store/session";

function reportSseError(error: unknown, fallback: string) {
  const message = error instanceof Error && error.message ? error.message : fallback;
  console.error(`[SSE] ${message}`, error);
}

export function useStreamEvents() {
  const sessionId = useSessionStore((s) => s.sessionId);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!sessionId) return;

    let active = true;

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

    void unlistenOnline.catch((error) => {
      if (active) reportSseError(error, "Falha ao observar streamers online");
    });
    void unlistenOffline.catch((error) => {
      if (active) reportSseError(error, "Falha ao observar streamers offline");
    });
    void actionCleanup.catch((error) => {
      if (active) reportSseError(error, "Falha ao observar notificações");
    });
    void SseController.start(sessionId, envVariables.VITE_API_BASE_URL).catch((error) => {
      if (active) reportSseError(error, "Falha ao iniciar atualizações em tempo real");
    });

    return () => {
      active = false;
      void SseController.stop().catch((error) => {
        reportSseError(error, "Falha ao encerrar atualizações em tempo real");
      });
      void unlistenOnline.then(
        (unlisten) => unlisten(),
        () => undefined,
      );
      void unlistenOffline.then(
        (unlisten) => unlisten(),
        () => undefined,
      );
      void actionCleanup.then(
        (listener) => listener.unregister(),
        () => undefined,
      );
    };
  }, [sessionId, queryClient]);
}
