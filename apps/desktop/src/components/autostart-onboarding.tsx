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
          className="flex flex-1 flex-col items-center justify-center gap-4 px-5 pb-8 text-center"
        >
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/15">
            <Computer aria-hidden="true" className="size-5 text-primary" />
          </div>

          <div className="flex flex-col gap-1">
            <h1 id="autostart-onboarding-title" className="text-sm font-semibold text-foreground">
              Iniciar com o computador?
            </h1>
            <p className="text-[11px] leading-4 text-muted-foreground">
              Assim o StreamPeek continua avisando quando seus streamers entrarem ao vivo.
            </p>
          </div>

          <div className="flex w-full flex-col gap-1">
            <Button
              size="sm"
              className="w-full cursor-pointer"
              disabled={onboarding.isEnabling}
              onClick={() => void onboarding.enable()}
            >
              {onboarding.isEnabling ? "Ativando..." : "Ativar"}
            </Button>
            <button
              type="button"
              className="cursor-pointer rounded-md py-1.5 text-[10px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
