import { orpc } from "@/lib/orpc";
import { usePathStore } from "@/store/path";
import { useSessionStore } from "@/store/session";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useLogout() {
  const navigate = usePathStore((state) => state.setPath);
  const queryClient = useQueryClient();

  return useMutation(
    orpc.auth.logout.mutationOptions({
      onSuccess: () => {
        queryClient.clear();
        useSessionStore.getState().clearSession();
        navigate("auth");
      },
    }),
  );
}
