import { AuthErrorBoundary, AuthProvider } from "@/lib/auth";
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
  return <Element />;
}

function AppSkeleton() {
  return (
    <section className="w-full h-full p-4 flex flex-col">
      <header className="w-full flex items-center justify-between">
        <div className="w-3.5 h-3.5 rounded bg-background animate-pulse" />
        <div className="size-6 rounded-md bg-background animate-pulse" />
      </header>
    </section>
  );
}
