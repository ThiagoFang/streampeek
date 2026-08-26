import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";

export function useExclusionList() {
  const { data } = useSuspenseQuery(orpc.notificationExclusion.list.queryOptions());
  return data;
}

export function useAddExclusion() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.notificationExclusion.add.mutationOptions({
      onSuccess: () =>
        queryClient.invalidateQueries({
          queryKey: orpc.notificationExclusion.list.queryOptions().queryKey,
        }),
    }),
  );
}

export function useRemoveExclusion() {
  const queryClient = useQueryClient();

  return useMutation(
    orpc.notificationExclusion.remove.mutationOptions({
      onSuccess: () =>
        queryClient.invalidateQueries({
          queryKey: orpc.notificationExclusion.list.queryOptions().queryKey,
        }),
    }),
  );
}
