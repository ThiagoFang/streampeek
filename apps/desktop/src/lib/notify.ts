import { sendNotification } from "@tauri-apps/plugin-notification";
import { resolveResource } from "@tauri-apps/api/path";

let iconPath: string | undefined;

async function getIconPath() {
  if (iconPath) return iconPath;
  iconPath = await resolveResource("icons/logo_streampeek.png").catch(() => undefined);
  return iconPath;
}

export async function notify(options: { title: string; body: string; extra?: Record<string, unknown> }) {
  const icon = await getIconPath();
  sendNotification({ ...options, icon });
}
