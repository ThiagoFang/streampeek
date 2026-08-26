import { orpc } from "@/lib/orpc";
import { usePathStore } from "@/store/path";
import { useSessionStore } from "@/store/session";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { open } from "@tauri-apps/plugin-shell";
import { useEffect, useState } from "react";

const POLLING_INTERVAL = 2000;

function useConnect() {
  const [authState, setAuthState] = useState<string | null>(null);
  const navigate = usePathStore((state) => state.setPath);
  const setSessionId = useSessionStore((state) => state.setSessionId);
  const queryClient = useQueryClient();

  const { mutate: connect, isPending: isOpeningAuth } = useMutation(
    orpc.auth.getAuthUrl.mutationOptions({
      onSuccess: async ({ url, state }) => {
        await open(url);
        setAuthState(state);
      },
    }),
  );

  const { data, isError } = useQuery({
    ...orpc.auth.getStatus.queryOptions({ input: { state: authState! } }),
    enabled: !!authState,
    meta: { errorPresentation: "toast" },
    throwOnError: false,
    refetchInterval: (query) => {
      return query.state.data?.authenticated ? false : POLLING_INTERVAL;
    },
  });

  useEffect(() => {
    if (isError) setAuthState(null);
  }, [isError]);

  const authenticatedSessionId = data?.authenticated ? data.session_id : null;

  useEffect(() => {
    if (!authenticatedSessionId) return;

    setSessionId(authenticatedSessionId);
    navigate("home");
    setAuthState(null);

    void queryClient.prefetchQuery(orpc.auth.getMe.queryOptions());
  }, [authenticatedSessionId, navigate, queryClient, setSessionId]);

  return { connect, isConnecting: isOpeningAuth || !!authState };
}

export { useConnect };
