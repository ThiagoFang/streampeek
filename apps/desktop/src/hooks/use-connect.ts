import { queryKeys } from "@/api/query-keys";
import { userApi } from "@/api/user";
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

  const { mutate: connect } = useMutation({
    mutationFn: userApi.getAuthUrl,
    onSuccess: ({ url, state }) => {
      setAuthState(state);
      open(url);
    },
    onError: (error) => {
      console.error("[useConnect]", error);
    },
  });

  const { data } = useQuery({
    queryKey: [...queryKeys.auth.status, authState],
    enabled: !!authState,
    queryFn: () => userApi.getAuthStatus(authState!),
    refetchInterval: (query) => {
      return query.state.data?.authenticated ? false : POLLING_INTERVAL;
    },
  });

  useEffect(() => {
    if (!data?.authenticated) return;

    setSessionId(data.session_id);
    setAuthState(null);

    (async () => {
      await queryClient.prefetchQuery({
        queryKey: queryKeys.auth.me,
        queryFn: userApi.getMe,
      });
      navigate("home");
    })();
  }, [data?.authenticated]);

  return { connect, isPolling: !!authState };
}

export { useConnect };
