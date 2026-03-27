import { useSuspenseQuery } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";
import { useSettingsStore } from "@/store/settings";

function useSettings() {
  const { data } = useSuspenseQuery(orpc.settings.get.queryOptions());
  return data;
}

function useUpdateSettings() {
  const queryClient = useQueryClient();
  const setNotificationsEnabled = useSettingsStore((s) => s.setNotificationsEnabled);

  return useMutation(
    orpc.settings.update.mutationOptions({
      onSuccess: (_data, variables) => {
        setNotificationsEnabled(variables.notifications_enabled);
        queryClient.invalidateQueries({ queryKey: orpc.settings.get.queryOptions().queryKey });
      },
    }),
  );
}

export { useSettings, useUpdateSettings };
