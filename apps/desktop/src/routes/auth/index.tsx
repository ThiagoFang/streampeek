import { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-shell";
import { usePathStore } from "@/store/path";
import { useMutation, useQuery } from "@tanstack/react-query";
import { userApi } from "@/api/user";


export function Auth() {
  const [polling, setPolling] = useState(false);
  const navigate = usePathStore((state) => state.setPath);

  const { mutate: connect } = useMutation({
    mutationFn: userApi.getAuthUrl,
    onSuccess: ({ url }) => {
      open(url);
      setPolling(true);
    },
  });

  const { data } = useQuery({
    queryKey: ["auth", "status"],
    enabled: polling,
    queryFn: userApi.getAuthStatus,
    refetchInterval: 2000,
  })

  useEffect(() => {
    if (!polling) return;
    if (data && data.authenticated) {
      setPolling(false);
      navigate("home")
    };
  }, [polling, data]);

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
        onClick={() => connect()}
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
