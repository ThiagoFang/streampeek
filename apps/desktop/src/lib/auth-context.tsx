import { orpc } from "@/lib/orpc";
import { usePathStore } from "@/store/path";
import { useSessionStore } from "@/store/session";
import { ORPCError } from "@orpc/client";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createContext, useContext, Component, type ReactNode } from "react";

type User = {
  user_id: string;
  user_login: string;
  user_display_name: string;
  profile_image_url: string;
};

const AuthContext = createContext<User | null>(null);

function AuthProvider({ children }: { children: ReactNode }) {
  const { data: user } = useSuspenseQuery(orpc.auth.getMe.queryOptions());

  return <AuthContext value={user}>{children}</AuthContext>;
}

function useUser() {
  const user = useContext(AuthContext);
  if (!user) throw new Error("useUser must be used within AuthProvider");
  return user;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

function AuthErrorBoundary({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  return <AuthErrorBoundaryInner queryClient={queryClient}>{children}</AuthErrorBoundaryInner>;
}

class AuthErrorBoundaryInner extends Component<
  { children: ReactNode; queryClient: ReturnType<typeof useQueryClient> },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; queryClient: ReturnType<typeof useQueryClient> }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    if (isAuthError(error)) return { hasError: true };
    throw error;
  }

  componentDidCatch() {
    this.props.queryClient.clear();
    useSessionStore.getState().clearSession();
    usePathStore.getState().setPath("auth");
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

function isAuthError(error: unknown): boolean {
  return error instanceof ORPCError && error.code === "UNAUTHORIZED";
}

export { AuthProvider, AuthErrorBoundary, useUser };
