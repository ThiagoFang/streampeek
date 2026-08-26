import { useSuspenseQuery } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";

function useSettings() {
  const { data } = useSuspenseQuery(orpc.settings.get.queryOptions());
  return data;
}

function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.settings.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: orpc.settings.get.queryOptions().queryKey });
      },
    }),
  );
}

export { useSettings, useUpdateSettings };
