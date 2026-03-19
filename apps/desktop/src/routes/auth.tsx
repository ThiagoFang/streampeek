import { Button } from "@/components/ui/button";
import { useConnect } from "@/hooks/use-connect";

export function Auth() {
  return (
    <section className="w-full gap-12 h-dvh p-4 flex flex-col items-center justify-center">
      <AuthContent />
      <AuthButton />
    </section>
  );
}

function AuthContent() {
  return (
    <>
      <img src="/logo_streampeek.png" alt="Logo StreamPeek" className="w-10" />

      <div className="space-y-2">
        <h1 className="text-lg/5 font-medium text-center text-foreground">
          Bem vindo ao <b className="font-extrabold">StreamPeek</b>
        </h1>
        <p className="text-center leading-5 tracking-wide max-w-xs text-sm mx-auto text-muted-foreground">
          Esteja sempre conectado com os streamers que você mais gosta
        </p>
      </div>
    </>
  );
}

function AuthButton() {
  const { connect, isPolling } = useConnect();

  return (
    <Button className="w-full cursor-pointer" disabled={isPolling} onClick={() => connect(undefined)}>
      {isPolling ? (
        "Conectando..."
      ) : (
        <span className="font-medium">
          Entrar com <span className="font-extrabold">Twitch.tv</span>
        </span>
      )}
    </Button>
  );
}
