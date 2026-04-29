import { Button } from "@/components/ui/button";
import { useConnect } from "@/hooks/use-connect";

export function Auth() {
  return (
    <section className="w-full gap-9 h-full p-4 flex flex-col items-center justify-center bg-background">
      <AuthContent />
      <AuthButton />
    </section>
  );
}

function AuthContent() {
  return (
    <>
      <div className="relative">
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-7 rounded-full bg-primary"
          style={{ animation: "logo-breathe 6s ease-in-out infinite" }}
        />
        <img src="/logo_streampeek.png" alt="Logo StreamPeek" className="w-[30px] h-[46px]" />
      </div>

      <div className="flex flex-col items-center gap-0.5 w-full">
        <h1 className="text-[16px] font-medium leading-6 text-foreground">
          Bem vindo ao <b className="font-bold">StreamPeek</b>
        </h1>
        <p className="text-[12px] font-light leading-[14px] text-muted-foreground text-center">
          Acompanhe os seus streamers
          <br />
          favoritos
        </p>
      </div>
    </>
  );
}

function AuthButton() {
  const { connect, isPolling } = useConnect();

  return (
    <Button
      className="w-full cursor-pointer rounded-lg py-1 px-6"
      disabled={isPolling}
      onClick={() => connect(undefined)}
    >
      {isPolling ? (
        "Conectando..."
      ) : (
        <span className="text-[12px] font-medium text-foreground">
          Entrar com <span className="font-semibold">Twitch.tv</span>
        </span>
      )}
    </Button>
  );
}
