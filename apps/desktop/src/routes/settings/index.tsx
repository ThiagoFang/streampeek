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
      <div className="flex flex-1 flex-col gap-5 px-3 py-3">
        <div className="flex flex-1 flex-col gap-5">
          <SettingsToggles />
          <Suspense
            fallback={<div className="px-1 py-2 text-xs text-muted-foreground">Carregando...</div>}
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
      <SettingsSectionHeader title="Geral" />
      <div className="rounded-xl border border-border/70 bg-secondary/35 p-1">
        <NotificationsToggle />
        <div className="mx-2 h-px bg-border/60" />
        <AutostartToggle />
      </div>
    </div>
  );
}

function NotificationsToggle() {
  const { notifications_enabled } = useSettings();
  const { mutate, isPending } = useUpdateSettings();

  return (
    <label
      htmlFor="notifications-enabled"
      className="flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2.5 transition-colors hover:bg-accent/70"
    >
      <div className="flex items-center gap-2">
        <Bell aria-hidden="true" className="size-4 text-muted-foreground" />
        <span className="text-[13px] font-medium">Permitir notificações</span>
      </div>
      <Switch
        id="notifications-enabled"
        checked={notifications_enabled}
        disabled={isPending}
        onCheckedChange={(checked) => mutate({ notifications_enabled: checked })}
      />
    </label>
  );
}

function SettingsSectionHeader({ title }: { title: string }) {
  return (
    <h2 className="px-1 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
      {title}
    </h2>
  );
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
      className="flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2.5 transition-colors hover:bg-accent/70"
    >
      <div className="flex items-center gap-2">
        <Computer aria-hidden="true" className="size-4 text-muted-foreground" />
        <span className="text-[13px] font-medium">Executar ao iniciar</span>
      </div>
      <Switch
        id="autostart-enabled"
        checked={enabled ?? false}
        disabled={enabled === null || isUpdating}
        onCheckedChange={handleChange}
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
        <span className="rounded-xl border border-border/70 bg-secondary/35 px-3 py-3 text-[12px] text-muted-foreground">
          Nenhum streamer silenciado
        </span>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {exclusionList.map((item) => (
            <button
              key={item.broadcaster_id}
              type="button"
              aria-label={`Remover ${item.broadcaster_name} dos streamers silenciados`}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border/70 bg-secondary/60 px-2.5 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isPending}
              onClick={() => mutate({ broadcaster_id: item.broadcaster_id })}
            >
              <X aria-hidden="true" className="size-3" />
              <span className="text-[12px] font-medium">{item.broadcaster_name}</span>
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
    <div className="mt-auto flex flex-col border-t border-border/60 pt-2">
      <button
        type="button"
        className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 transition-colors hover:bg-accent/70"
        onClick={closeApplication}
      >
        <X aria-hidden="true" className="size-4 text-muted-foreground" />
        <span className="text-[12px] font-medium text-muted-foreground">Fechar aplicativo</span>
      </button>
      <button
        type="button"
        className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 transition-colors hover:bg-destructive/10"
        onClick={() => logout(undefined)}
      >
        <LogOut aria-hidden="true" className="size-4 text-destructive" />
        <span className="text-[12px] font-medium text-destructive">Desconectar conta</span>
      </button>
    </div>
  );
}
