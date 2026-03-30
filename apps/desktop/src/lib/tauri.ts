import { enable, disable } from "@tauri-apps/plugin-autostart";

export async function toggleAutostart(enabled: boolean) {
  if (enabled) {
    await enable();
  } else {
    await disable();
  }
}
