import type { ReactNode } from "react";
import { Computer } from "lucide-react";
import { useAutostartOnboarding } from "@/hooks/use-autostart-onboarding";
import { Layout } from "./authenticated-layout";
import { Button } from "./ui/button";

export function AutostartOnboarding({ children }: { children: ReactNode }) {
  const onboarding = useAutostartOnboarding();

  if (!onboarding.isChecking && !onboarding.shouldShow) return children;

  return (
    <Layout>
      {onboarding.isChecking ? (
        <div className="flex flex-1 items-center justify-center" aria-label="Carregando">
          <div className="size-8 animate-pulse rounded-full bg-accent" />
        </div>
      ) : (
        <main
          aria-labelledby="autostart-onboarding-title"
          className="flex flex-1 flex-col items-center justify-center gap-5 px-6 pb-6 text-center"
        >
          <div className="flex size-12 items-center justify-center rounded-2xl border border-border bg-secondary">
            <Computer aria-hidden="true" className="size-5 text-foreground" />
          </div>

          <div className="flex flex-col gap-2">
            <h1
              id="autostart-onboarding-title"
              className="text-[15px] font-semibold tracking-tight text-foreground"
            >
              Iniciar com o computador?
            </h1>
            <p className="text-[13px] leading-5 text-muted-foreground">
              Assim o StreamPeek continua avisando quando seus streamers entrarem ao vivo.
            </p>
          </div>

          <div className="flex w-full flex-col gap-1">
            <Button
              className="w-full cursor-pointer rounded-xl text-[13px]"
              disabled={onboarding.isEnabling}
              onClick={() => void onboarding.enable()}
            >
              {onboarding.isEnabling ? "Ativando..." : "Ativar"}
            </Button>
            <button
              type="button"
              className="cursor-pointer rounded-lg py-2 text-[12px] text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              disabled={onboarding.isEnabling}
              onClick={onboarding.skip}
            >
              Agora não
            </button>
          </div>
        </main>
      )}
    </Layout>
  );
}
