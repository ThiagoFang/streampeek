import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-shell";
import { usePathStore } from "@/store/path";
import { useMutation } from "@tanstack/react-query";
import { userApi } from "@/api/user";


export function Auth() {
  const [polling, setPolling] = useState(false);
  const navigate = usePathStore((state) => state.setPath);

  const { mutate: connect } = useMutation({
    mutationFn: userApi.getAuthUrl,
    onSuccess: ({ url }) => {
      open(url);
    },
  });

  const { mutateAsync: checkAuthStatus } = useMutation({
    mutationFn: userApi.getAuthStatus,
    onSuccess: (data) => {
      if (data.authenticated) {
        usePathStore.getState().setPath("home");
      }
    },
  });

  const handleConnect = () => {
    connect();
    setPolling(true);
  };

  useEffect(() => {
    if (!polling) return;

    const interval = setInterval(async () => {
      const { data } = await checkAuthStatus();

      if (data.authenticated) {
        clearInterval(interval);

        setPolling(false);
        navigate("home");
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
