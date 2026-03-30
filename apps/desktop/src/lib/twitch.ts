import { open } from "@tauri-apps/plugin-shell";

export function openTwitchChannel(login: string) {
  open(`https://twitch.tv/${login}`);
}
