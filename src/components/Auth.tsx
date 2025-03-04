import { usePathStore } from "../store/path";

export function Auth() {
  const setPath = usePathStore((state) => state.setPath);

  function handleAuth() {
    setPath("home");
  }

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
        onClick={handleAuth}
        className="p-2 font-medium rounded-md bg-primary w-full text-background"
      >
        Entrar com <span className="font-bold">Twitch.tv</span>
      </button>
    </section>
  );
}
