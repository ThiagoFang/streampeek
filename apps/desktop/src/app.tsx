import { AuthErrorBoundary, AuthProvider } from "@/lib/auth";
import { useStreamEvents } from "@/hooks/use-stream-events";
import { navigationClient } from "./navigation";
import { usePathStore } from "./store/path";
import { Auth } from "./routes/auth";
import { Suspense } from "react";

export default function App() {
  const path = usePathStore((state) => state.path);

  if (path === "auth") return <Auth />;

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
    <section className="w-full h-dvh p-4 flex flex-col">
      <header className="w-full flex items-center justify-between">
        <div className="w-3.5 h-3.5 rounded bg-muted animate-pulse" />
        <div className="size-6 rounded-md bg-muted animate-pulse" />
      </header>
    </section>
  );
}
