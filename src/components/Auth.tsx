import { ipcRenderer } from "electron";
import { CLIENT_ID } from "../lib/env";
import { useEffect } from "react";

const REDIRECT_URI = "http://localhost";
const AUTH_URL = `https://id.twitch.tv/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=token&scope=user:read:email`;

export function Auth() {
  // const setPath = usePathStore((state) => state.setPath);

  useEffect(() => {
    ipcRenderer.on("auth-success", (event, accessToken: string) => {
      console.log(
        "Evento auth-success recebido no renderer com token:",
        accessToken
      );
      // setToken(accessToken);
      // setMessage('Autenticado com sucesso!');
    });

    return () => {
      ipcRenderer.removeAllListeners("auth-success");
    };
  }, []);

  const handleConnect = () => {
    console.log('Botão "Conectar" clicado, enviando start-auth');
    ipcRenderer.send("start-auth", AUTH_URL);
  };

  return (
    <section className="w-full gap-8 h-dvh p-4 flex flex-col items-center justify-center">
      <img src="/logo_streampeek.png" alt="Logo StreamPeek" className="w-6" />

      <div>
        <h1 className="text-lg/5 font-medium text-center text-foreground">
          Bem vindo ao <b className="font-bold">StreamPeek</b>
        </h1>
        <p className="text-center text-muted-foreground">
          Acompanhe os seus streamers favoritos
        </p>
      </div>
      <button
        // onClick={handleAuth}
        onClick={handleConnect}
        className="p-2 font-medium rounded-md bg-primary w-full text-background"
      >
        Entrar com <span className="font-bold">Twitch.tv</span>
      </button>
    </section>
  );
}
