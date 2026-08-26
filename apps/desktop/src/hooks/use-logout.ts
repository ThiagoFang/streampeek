import { orpc } from "@/lib/orpc";
import { useSessionStore } from "@/store/session";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.auth.logout.mutationOptions({
      onSuccess: () => {
        queryClient.clear();
        useSessionStore.getState().clearSession();
      },
    }),
  );
}
