import { AuthErrorBoundary, AuthProvider } from "@/lib/auth";
import { AutostartOnboarding } from "@/components/autostart-onboarding";
import { useStreamEvents } from "@/hooks/use-stream-events";
import { useSessionStore } from "@/store/session";
import { navigationClient } from "./navigation";
import { usePathStore } from "./store/path";
import { Auth } from "./routes/auth";
import { Suspense } from "react";

export default function App() {
  const sessionId = useSessionStore((state) => state.sessionId);

  if (!sessionId) return <Auth />;

  return (
    <Suspense fallback={<AppSkeleton />}>
      <AuthErrorBoundary>
        <AuthProvider>
          <AuthenticatedApp />
        </AuthProvider>
      </AuthErrorBoundary>
    </Suspense>
  );
}

function AuthenticatedApp() {
  useStreamEvents();
  const path = usePathStore((state) => state.path);
  const Element = navigationClient[path];
  return (
    <AutostartOnboarding>
      <Element />
    </AutostartOnboarding>
  );
}

function AppSkeleton() {
  return (
    <section
      role="status"
      aria-label="Carregando aplicativo"
      className="flex h-full w-full flex-col"
    >
      <header
        aria-hidden="true"
        className="flex w-full items-center justify-between border-b border-border/70 px-3 py-2.5"
      >
        <div className="size-7 animate-pulse rounded-lg bg-accent" />
        <div className="size-7 animate-pulse rounded-lg bg-accent" />
      </header>
    </section>
  );
}
