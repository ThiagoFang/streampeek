import { orpc } from "@/lib/orpc";
import { AutostartOnboardingPreference } from "@/lib/autostart-onboarding";
import { usePathStore } from "@/store/path";
import { useSessionStore } from "@/store/session";
import { Toast } from "@/store/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { open } from "@tauri-apps/plugin-shell";
import { useCallback, useEffect, useRef, useState } from "react";

const POLLING_INTERVAL = 2000;
const CANCEL_REVEAL_DELAY = 20_000;
const LOGIN_TIMEOUT = 5 * 60_000;

function useConnect() {
  const [authState, setAuthState] = useState<string | null>(null);
  const [canCancel, setCanCancel] = useState(false);
  const activeAuthState = useRef<string | null>(null);
  const navigate = usePathStore((state) => state.setPath);
  const setSessionId = useSessionStore((state) => state.setSessionId);
  const queryClient = useQueryClient();

  const { mutate: connect, isPending: isOpeningAuth } = useMutation(
    orpc.auth.getAuthUrl.mutationOptions({
      onSuccess: async ({ url, state }) => {
        await open(url);
        activeAuthState.current = state;
        setCanCancel(false);
        setAuthState(state);
      },
    }),
  );

  const { mutate: cancelLogin } = useMutation(orpc.auth.cancelLogin.mutationOptions());

  const cancelLoginRequest = useCallback(
    (state: string, timedOut: boolean) => {
      activeAuthState.current = null;
      setAuthState((current) => (current === state ? null : current));
      setCanCancel(false);

      void queryClient.cancelQueries({
        queryKey: orpc.auth.getStatus.queryOptions({ input: { state } }).queryKey,
      });
      cancelLogin({ state });

      if (timedOut) {
        Toast.error("O login demorou demais. Tente novamente.");
      }
    },
    [cancelLogin, queryClient],
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
    if (isError && authState) cancelLoginRequest(authState, false);
  }, [authState, cancelLoginRequest, isError]);

  useEffect(() => {
    if (!authState) return;

    const revealCancel = window.setTimeout(() => setCanCancel(true), CANCEL_REVEAL_DELAY);
    const expireLogin = window.setTimeout(() => cancelLoginRequest(authState, true), LOGIN_TIMEOUT);

    return () => {
      window.clearTimeout(revealCancel);
      window.clearTimeout(expireLogin);
    };
  }, [authState, cancelLoginRequest]);

  const authenticatedSessionId = data?.authenticated ? data.session_id : null;

  useEffect(() => {
    if (!authState || activeAuthState.current !== authState || !authenticatedSessionId) {
      return;
    }

    activeAuthState.current = null;
    AutostartOnboardingPreference.request();
    setSessionId(authenticatedSessionId);
    navigate("home");
    setAuthState(null);
    setCanCancel(false);

    void queryClient.prefetchQuery(orpc.auth.getMe.queryOptions());
  }, [authState, authenticatedSessionId, navigate, queryClient, setSessionId]);

  return {
    connect,
    cancel: () => {
      if (authState) cancelLoginRequest(authState, false);
    },
    isConnecting: isOpeningAuth || !!authState,
    canCancel: !!authState && canCancel,
  };
}

export { useConnect };
