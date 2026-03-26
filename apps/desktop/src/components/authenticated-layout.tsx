import { useUser } from "@/lib/auth-context";
import { usePathStore } from "@/store/path";

function Header() {
  const navigate = usePathStore((state) => state.setPath);
  const user = useUser();

  return (
    <header className="sticky top-0 z-10 w-full flex items-center justify-between bg-background px-4 py-2">
      <img
        src="/logo_streampeek.png"
        alt="Logo StreamPeek"
        className="w-3.5 cursor-pointer"
        onClick={() => navigate("home")}
      />

      <div
        className="size-6 rounded-md bg-primary flex items-center justify-center text-background font-bold cursor-pointer"
        onClick={() => navigate("settings")}
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
    <section className="w-full h-dvh overflow-y-auto flex flex-col gap-2" {...rest}>
      <Header />
      {children}
    </section>
  );
}

export { Layout };
