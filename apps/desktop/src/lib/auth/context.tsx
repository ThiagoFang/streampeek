import { orpc } from "@/lib/orpc";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createContext, useContext, type ReactNode } from "react";

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

export { AuthProvider, useUser };
