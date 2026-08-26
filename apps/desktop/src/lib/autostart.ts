import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";

interface AutostartCommands {
  disable: () => Promise<void>;
  enable: () => Promise<void>;
  isEnabled: () => Promise<boolean>;
}

export function createAutostartService(commands: AutostartCommands) {
  return {
    isEnabled: commands.isEnabled,
    setEnabled(enabled: boolean) {
      return enabled ? commands.enable() : commands.disable();
    },
  };
}

export const Autostart = createAutostartService({ disable, enable, isEnabled });
