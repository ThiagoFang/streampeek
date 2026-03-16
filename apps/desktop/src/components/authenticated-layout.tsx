import { userApi } from "@/api/user";
import { useUser } from "@/lib/auth-context";
import { usePathStore } from "@/store/path";
import { useSessionStore } from "@/store/session";
import { useMutation, useQueryClient } from "@tanstack/react-query";

function Header() {
  const navigate = usePathStore((state) => state.setPath);
  const user = useUser();
  const queryClient = useQueryClient();

  const { mutate: logout } = useMutation({
    mutationFn: userApi.logout,
    onSuccess: () => {
      queryClient.clear();
      useSessionStore.getState().clearSession();
      navigate("auth");
    },
  });

  function handleOpenHome() {
    navigate("home");
  }

  return (
    <header className="w-full flex items-center justify-between">
      <img
        src="/logo_streampeek.png"
        alt="Logo StreamPeek"
        className="w-3.5 cursor-pointer"
        onClick={handleOpenHome}
      />

      <div
        className="size-6 rounded-md bg-primary flex items-center justify-center text-background font-bold cursor-pointer"
        onClick={() => logout()}
      >
        {user.user_display_name.charAt(0)}
      </div>
    </header>
  );
}

interface AuthenticatedLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

function Layout({ children, ...rest }: AuthenticatedLayoutProps) {
  return (
    <section className="w-full h-dvh p-4 flex flex-col" {...rest}>
      <Header />
      {children}
    </section>
  );
}

export { Layout };
