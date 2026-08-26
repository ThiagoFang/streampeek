import { Button } from "@/components/ui/button";
import { useConnect } from "@/hooks/use-connect";

export function Auth() {
  return (
    <section className="flex h-full w-full flex-col items-center justify-center gap-7 px-6 pb-6">
      <AuthContent />
      <AuthActions />
    </section>
  );
}

function AuthContent() {
  return (
    <div className="flex w-full flex-col items-center gap-5">
      <div className="flex size-16 items-center justify-center rounded-2xl border border-border bg-secondary">
        <img src="/logo_streampeek.png" alt="Logo StreamPeek" className="h-9 w-auto" />
      </div>

      <div className="flex w-full flex-col items-center gap-2">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">StreamPeek</h1>
        <p className="text-center text-[13px] leading-5 text-muted-foreground">
          Seus streamers favoritos ao vivo.
          <br />
          Sem perder o momento.
        </p>
      </div>
    </div>
  );
}

function AuthActions() {
  const { connect, cancel, isConnecting, canCancel } = useConnect();

  return (
    <div className="relative w-full">
      <Button
        className="w-full cursor-pointer rounded-xl px-4 text-[13px]"
        disabled={isConnecting}
        onClick={() => connect(undefined)}
      >
        {isConnecting ? (
          "Conectando..."
        ) : (
          <span>
            Entrar com <span className="font-semibold">Twitch</span>
          </span>
        )}
      </Button>

      {canCancel && (
        <button
          type="button"
          className="absolute top-full left-1/2 mt-3 -translate-x-1/2 cursor-pointer rounded-md px-2 py-1 text-[12px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={cancel}
        >
          Cancelar
        </button>
      )}
    </div>
  );
}
