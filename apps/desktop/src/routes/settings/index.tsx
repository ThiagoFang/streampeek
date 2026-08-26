import { Suspense, useEffect, useState } from "react";
import { Layout } from "@/components/authenticated-layout";
import { useExclusionList, useRemoveExclusion } from "@/hooks/use-exclusion-list";
import { useLogout } from "@/hooks/use-logout";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { Autostart } from "@/lib/autostart";
import { getErrorMessage } from "@/lib/error-message";
import { Toast } from "@/store/toast";
import { Switch } from "@/components/ui/switch";
import { getCurrentWindow } from "@tauri-apps/api/window";
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
  const { mutate, isPending } = useUpdateSettings();

  return (
    <label
      htmlFor="notifications-enabled"
      className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-2 transition-colors hover:bg-accent"
    >
      <div className="flex items-center gap-2">
        <Bell aria-hidden="true" className="size-4" />
        <span className="text-[12px] font-medium">Permitir Notificações</span>
      </div>
      <Switch
        id="notifications-enabled"
        checked={notifications_enabled}
        disabled={isPending}
        onCheckedChange={(checked) => mutate({ notifications_enabled: checked })}
        size="sm"
      />
    </label>
  );
}

function SettingsSectionHeader({ title }: { title: string }) {
  return <h2 className="px-2 text-[12px] font-medium text-muted-foreground">{title}</h2>;
}

function AutostartToggle() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    void Autostart.isEnabled()
      .then(setEnabled)
      .catch((error) => {
        Toast.error(getErrorMessage(error, "Não foi possível consultar o início automático"));
      });
  }, []);

  const handleChange = async (checked: boolean) => {
    setIsUpdating(true);
    try {
      await Autostart.setEnabled(checked);
      setEnabled(checked);
    } catch (error) {
      Toast.error(getErrorMessage(error, "Não foi possível alterar o início automático"));
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <label
      htmlFor="autostart-enabled"
      className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-2 transition-colors hover:bg-accent"
    >
      <div className="flex items-center gap-2">
        <Computer aria-hidden="true" className="size-4" />
        <span className="text-[12px] font-medium">Executar ao iniciar</span>
      </div>
      <Switch
        id="autostart-enabled"
        checked={enabled ?? false}
        disabled={enabled === null || isUpdating}
        onCheckedChange={handleChange}
        size="sm"
      />
    </label>
  );
}

function SettingsExclusionList() {
  const exclusionList = useExclusionList();
  const { mutate, isPending } = useRemoveExclusion();

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
              type="button"
              aria-label={`Remover ${item.broadcaster_name} dos streamers silenciados`}
              className="flex cursor-pointer items-center gap-2 rounded-lg bg-destructive/10 p-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isPending}
              onClick={() => mutate({ broadcaster_id: item.broadcaster_id })}
            >
              <X aria-hidden="true" className="size-3 text-destructive" />
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
        <X aria-hidden="true" className="size-4 text-muted-foreground" />
        <span className="text-[12px] font-medium text-muted-foreground">Fechar Aplicativo</span>
      </button>
      <button
        type="button"
        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-accent"
        onClick={() => logout(undefined)}
      >
        <LogOut aria-hidden="true" className="size-4 text-destructive" />
        <span className="text-[12px] font-medium text-destructive">Desconectar</span>
      </button>
    </div>
  );
}
