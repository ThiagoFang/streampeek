import { Suspense } from "react";
import { Layout } from "@/components/authenticated-layout";
import { useExclusionList, useRemoveExclusion } from "@/hooks/use-exclusion-list";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { orpc } from "@/lib/orpc";
import { usePathStore } from "@/store/path";
import { useSessionStore } from "@/store/session";
import { Switch } from "@/components/ui/switch";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Bell, Computer, LogOut, Moon, X } from "lucide-react";

export function Settings() {
  return (
    <Layout>
      <div className="flex flex-1 flex-col gap-4 px-2 pb-2">
        <div className="flex flex-1 flex-col gap-4">
          <SettingsToggles />
          <Suspense
            fallback={<div className="px-4 py-2 text-xs text-muted-foreground">Carregando...</div>}
          >
            <SettingsExclusionList />
          </Suspense>
        </div>
        <SettingsFooter />
      </div>
    </Layout>
  );
}

function SettingsToggles() {
  return (
    <div className="flex flex-col gap-2">
      <SettingsSectionHeader title="Configurações Gerais" />
      <NotificationsToggle />
      <SettingsToggleItem icon={Computer} label="Executar ao iniciar" />
      <SettingsToggleItem icon={Moon} label="Modo Escuro" defaultChecked />
    </div>
  );
}

function NotificationsToggle() {
  const { notifications_enabled } = useSettings();
  const { mutate } = useUpdateSettings();

  return (
    <div className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-2 transition-colors hover:bg-accent">
      <div className="flex items-center gap-2">
        <Bell className="size-4" />
        <span className="text-[12px] font-medium">Permitir Notificações</span>
      </div>
      <Switch
        checked={notifications_enabled}
        onCheckedChange={(checked) => mutate({ notifications_enabled: checked })}
        size="sm"
      />
    </div>
  );
}

function SettingsSectionHeader({ title }: { title: string }) {
  return (
    <div className="px-2">
      <span className="text-[12px] font-medium text-muted-foreground">{title}</span>
    </div>
  );
}

function SettingsToggleItem({
  icon: Icon,
  label,
  defaultChecked = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <div className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-2 transition-colors hover:bg-accent">
      <div className="flex items-center gap-2">
        <Icon className="size-4" />
        <span className="text-[12px] font-medium">{label}</span>
      </div>
      <Switch defaultChecked={defaultChecked} size="sm" />
    </div>
  );
}

function SettingsExclusionList() {
  const exclusionList = useExclusionList();
  const { mutate } = useRemoveExclusion();

  return (
    <div className="flex flex-col gap-2">
      <SettingsSectionHeader title="Streamers silenciados" />
      {exclusionList.length === 0 ? (
        <span className="px-4 py-2 text-xs text-muted-foreground">Nenhum streamer excluído</span>
      ) : (
        <div className="flex flex-wrap gap-2">
          {exclusionList.map((item) => (
            <button
              key={item.broadcaster_id}
              className="flex cursor-pointer items-center gap-2 rounded-lg bg-destructive/10 p-2"
              onClick={() => mutate({ broadcaster_id: item.broadcaster_id })}
            >
              <X className="size-3 text-destructive" />
              <span className="text-xs font-medium text-destructive">{item.broadcaster_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsFooter() {
  const navigate = usePathStore((state) => state.setPath);
  const queryClient = useQueryClient();

  const { mutate: logout } = useMutation(
    orpc.auth.logout.mutationOptions({
      onSuccess: () => {
        queryClient.clear();
        useSessionStore.getState().clearSession();
        navigate("auth");
      },
    }),
  );

  return (
    <div className="flex flex-col">
      <button
        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-accent"
        onClick={() => getCurrentWindow().close()}
      >
        <X className="size-4 text-muted-foreground" />
        <span className="text-[12px] font-medium text-muted-foreground">Fechar Aplicativo</span>
      </button>
      <button
        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-accent"
        onClick={() => logout(undefined)}
      >
        <LogOut className="size-4 text-destructive" />
        <span className="text-[12px] font-medium text-destructive">Desconectar</span>
      </button>
    </div>
  );
}
