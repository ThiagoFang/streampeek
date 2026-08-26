import { open } from "@tauri-apps/plugin-shell";
import { getErrorMessage } from "@/lib/error-message";
import { Toast } from "@/store/toast";

export function openTwitchChannel(channelSlug: string) {
  void open(`https://twitch.tv/${channelSlug}`).catch((error) => {
    Toast.error(getErrorMessage(error, "Não foi possível abrir o canal da Twitch"));
  });
}
