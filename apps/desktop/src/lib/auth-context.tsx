import { queryKeys } from "@/api/query-keys";
import { userApi } from "@/api/user";
import { usePathStore } from "@/store/path";
import { useSessionStore } from "@/store/session";
import type { MeResponse } from "@/types/auth";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createContext, useContext, Component, type ReactNode } from "react";

const AuthContext = createContext<MeResponse | null>(null);

function AuthProvider({ children }: { children: ReactNode }) {
  const { data: user } = useSuspenseQuery({
    queryKey: queryKeys.auth.me,
    queryFn: userApi.getMe,
  });

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

  return (
    <AuthErrorBoundaryInner queryClient={queryClient}>
      {children}
    </AuthErrorBoundaryInner>
  );
}

class AuthErrorBoundaryInner extends Component<
  { children: ReactNode; queryClient: ReturnType<typeof useQueryClient> },
  ErrorBoundaryState
> {
  constructor(
    props: {
      children: ReactNode;
      queryClient: ReturnType<typeof useQueryClient>;
    },
  ) {
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
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status: unknown }).status === "number"
  ) {
    return (error as { status: number }).status === 401;
  }
  return false;
}

export { AuthProvider, AuthErrorBoundary, useUser };
