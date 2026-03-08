import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-shell";
import axios from "redaxios";
import { usePathStore } from "@/store/path";

const API_BASE = "http://localhost:3000";

export function Auth() {
  const [polling, setPolling] = useState(false);

  const handleConnect = async () => {
    const { data } = await axios<{ url: string }>({
      method: "GET",
      baseURL: API_BASE,
      url: "/auth/twitch",
    });
    open(data.url);
    setPolling(true);
  };

  useEffect(() => {
    if (!polling) return;

    const interval = setInterval(async () => {
      const { data } = await axios<{ authenticated: boolean }>({
        method: "GET",
        baseURL: API_BASE,
        url: "/auth/status",
      });

      if (data.authenticated) {
        clearInterval(interval);
        usePathStore.getState().setPath("home");
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [polling]);

  return (
    <section className="w-full gap-8 h-dvh p-4 flex flex-col items-center justify-center">
      <img src="/logo_streampeek.png" alt="Logo StreamPeek" className="w-6" />

      <div>
        <h1 className="text-lg/5 font-medium text-center text-foreground">
          Bem vindo ao <b className="font-bold">StreamPeek</b>
        </h1>
        <p className="text-center text-muted-foreground">Acompanhe os seus streamers favoritos</p>
      </div>
      <button
        onClick={handleConnect}
        disabled={polling}
        className="p-2 font-medium rounded-md bg-primary w-full text-background"
      >
        {polling ? (
          "Aguardando login..."
        ) : (
          <>
            Entrar com <span className="font-bold">Twitch.tv</span>
          </>
        )}
      </button>
    </section>
  );
}
