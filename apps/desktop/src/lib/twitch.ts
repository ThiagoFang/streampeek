import { open } from "@tauri-apps/plugin-shell";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { getErrorMessage } from "@/lib/error-message";
import { Toast } from "@/store/toast";

export function openTwitchChannel(channelSlug: string) {
  void open(`https://twitch.tv/${channelSlug}`).then(
    () => {
      void getCurrentWindow()
        .hide()
        .catch((error) => {
          Toast.error(getErrorMessage(error, "Não foi possível ocultar a janela"));
        });
    },
    (error) => {
      Toast.error(getErrorMessage(error, "Não foi possível abrir o canal da Twitch"));
    },
  );
}
