import { Layout } from "@/components/authenticated-layout";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { orpc } from "@/lib/orpc";
import { usePathStore } from "@/store/path";
import { useSessionStore } from "@/store/session";
import { Switch } from "@/components/ui/switch";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, ChevronLeft, Computer, LogOut, Moon, X } from "lucide-react";

const mockExclusionList = ["maethe", "Calango", "asusbrasiltv", "hades", "myhoyobrasil", "takeshi"];

export function Settings() {
  return (
    <Layout>
      <div className="flex flex-1 flex-col gap-4 px-4 pb-4">
        <SettingsBackLink />
        <div className="flex flex-1 flex-col gap-4">
          <SettingsToggles />
          <SettingsExclusionList />
        </div>
        <SettingsFooter />
      </div>
    </Layout>
  );
}

function SettingsBackLink() {
  const navigate = usePathStore((state) => state.setPath);

  return (
    <button className="flex cursor-pointer items-center gap-1" onClick={() => navigate("home")}>
      <ChevronLeft className="size-3" />
      <span className="text-xs font-medium">Voltar</span>
    </button>
  );
}

function SettingsToggles() {
  return (
    <div className="flex flex-col gap-2">
      <SettingsSectionHeader title="Configurações" />
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
    <div className="flex items-center justify-between px-4 py-2">
      <div className="flex items-center gap-2">
        <Bell className="size-4" />
        <span className="text-sm font-medium">Permitir Notificações</span>
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
    <div className="border-b border-border pb-2">
      <span className="text-xs font-medium">{title}</span>
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
    <div className="flex items-center justify-between px-4 py-2">
      <div className="flex items-center gap-2">
        <Icon className="size-4" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <Switch defaultChecked={defaultChecked} size="sm" />
    </div>
  );
}

function SettingsExclusionList() {
  return (
    <div className="flex flex-col gap-2">
      <SettingsSectionHeader title="Lista de Exclusão" />
      <div className="flex flex-wrap gap-2">
        {mockExclusionList.map((name) => (
          <div key={name} className="flex items-center gap-2 rounded-lg bg-destructive/10 p-2">
            <X className="size-3 text-destructive" />
            <span className="text-xs font-medium text-destructive">{name}</span>
          </div>
        ))}
      </div>
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
      <button className="flex cursor-pointer items-center gap-2 px-4 py-2">
        <X className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">Fechar Aplicativo</span>
      </button>
      <button
        className="flex cursor-pointer items-center gap-2 px-4 py-2"
        onClick={() => logout(undefined)}
      >
        <LogOut className="size-4 text-destructive" />
        <span className="text-sm font-medium text-destructive">Desconectar</span>
      </button>
    </div>
  );
}
