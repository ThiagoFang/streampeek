import { usePathStore } from "@/store/path";
import { useSessionStore } from "@/store/session";
import { useQueryClient } from "@tanstack/react-query";
import { Component, type ReactNode } from "react";
import { isAuthError } from "./guard";

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

export { AuthErrorBoundary };
