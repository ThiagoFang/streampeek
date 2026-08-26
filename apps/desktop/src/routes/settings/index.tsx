import { Suspense, useEffect, useState } from "react";
import { Layout } from "@/components/authenticated-layout";
import { useExclusionList, useRemoveExclusion } from "@/hooks/use-exclusion-list";
import { useLogout } from "@/hooks/use-logout";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { toggleAutostart } from "@/lib/tauri";
import { getErrorMessage } from "@/lib/error-message";
import { Toast } from "@/store/toast";
import { Switch } from "@/components/ui/switch";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isEnabled } from "@tauri-apps/plugin-autostart";
import { Bell, Computer, LogOut, X } from "lucide-react";

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
      <AutostartToggle />
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

function AutostartToggle() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    void isEnabled()
      .then(setEnabled)
      .catch((error) => {
        Toast.error(getErrorMessage(error, "Não foi possível consultar o início automático"));
      });
  }, []);

  const handleChange = async (checked: boolean) => {
    try {
      await toggleAutostart(checked);
      setEnabled(checked);
    } catch (error) {
      Toast.error(getErrorMessage(error, "Não foi possível alterar o início automático"));
    }
  };

  return (
    <div className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-2 transition-colors hover:bg-accent">
      <div className="flex items-center gap-2">
        <Computer className="size-4" />
        <span className="text-[12px] font-medium">Executar ao iniciar</span>
      </div>
      <Switch checked={enabled} onCheckedChange={handleChange} size="sm" />
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
  const { mutate: logout } = useLogout();
  const closeApplication = () => {
    void getCurrentWindow()
      .close()
      .catch((error) =>
        Toast.error(getErrorMessage(error, "Não foi possível fechar o aplicativo")),
      );
  };

  return (
    <div className="flex flex-col">
      <button
        type="button"
        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-accent"
        onClick={closeApplication}
      >
        <X className="size-4 text-muted-foreground" />
        <span className="text-[12px] font-medium text-muted-foreground">Fechar Aplicativo</span>
      </button>
      <button
        type="button"
        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-accent"
        onClick={() => logout(undefined)}
      >
        <LogOut className="size-4 text-destructive" />
        <span className="text-[12px] font-medium text-destructive">Desconectar</span>
      </button>
    </div>
  );
}
