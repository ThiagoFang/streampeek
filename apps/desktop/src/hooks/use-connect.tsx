import { queryKeys } from "@/api/query-keys";
import { userApi } from "@/api/user";
import { usePathStore } from "@/store/path";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { open } from "@tauri-apps/plugin-shell";
import { useEffect, useState } from "react";

const POLLING_INTERVAL = 2000;

function useConnect() {
  const [isPolling, setIsPolling] = useState(false);
  const navigate = usePathStore((state) => state.setPath);
  const queryClient = useQueryClient();

  const { mutate: connect } = useMutation({
    mutationFn: userApi.getAuthUrl,
    onSuccess: ({ url }) => {
      open(url);
      setIsPolling(true);
    },
    onError: (error) => {
      console.error("[useConnect]", error);
    },
  });

  const { data } = useQuery({
    queryKey: ["auth", "status"],
    enabled: isPolling,
    queryFn: userApi.getAuthStatus,
    refetchInterval: (query) => {
      // if the user is authenticated, stop polling
      return query.state.data?.authenticated ? false : POLLING_INTERVAL;
    },
  });

  useEffect(() => {
    if (data?.authenticated) {
      setIsPolling(false);
      (async () => {
        await queryClient.prefetchQuery({
          queryKey: queryKeys.auth.me,
          queryFn: userApi.getMe,
        });
        navigate("home");
      })();
    }
  }, [data?.authenticated]);

  return { connect, isPolling };
}

export { useConnect };