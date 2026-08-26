import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { listen } from "@tauri-apps/api/event";
import { envVariables } from "@/lib/env";
import { getErrorMessage } from "@/lib/error-message";
import { orpc } from "@/lib/orpc";
import { SseController } from "@/lib/sse-controller";
import { useSessionStore } from "@/store/session";
import { Toast } from "@/store/toast";

function reportSseError(error: unknown, fallback: string) {
  const message = getErrorMessage(error, fallback);
  console.error(`[SSE] ${message}`, error);
  Toast.error(message);
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

    void unlistenOnline.catch((error) => {
      if (active) reportSseError(error, "Falha ao observar streamers online");
    });
    void unlistenOffline.catch((error) => {
      if (active) reportSseError(error, "Falha ao observar streamers offline");
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
    };
  }, [sessionId, queryClient]);
}
