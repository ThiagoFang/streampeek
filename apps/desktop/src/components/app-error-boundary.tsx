import { Component, type ErrorInfo, type ReactNode } from "react";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error("[AppErrorBoundary] Unexpected interface error", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main
        role="alert"
        className="flex h-full flex-col items-center justify-center gap-5 p-6 text-center"
      >
        <img src="/logo_streampeek.png" alt="" className="h-10" />
        <div className="flex flex-col gap-2">
          <h1 className="text-[15px] font-semibold tracking-tight text-foreground">
            Algo deu errado
          </h1>
          <p className="text-[12px] leading-5 text-muted-foreground">
            O StreamPeek encontrou um problema inesperado na interface.
          </p>
        </div>
        <button
          type="button"
          className="w-full cursor-pointer rounded-xl bg-primary px-4 py-2.5 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => window.location.reload()}
        >
          Recarregar aplicativo
        </button>
      </main>
    );
  }
}
