import { useUser } from "@/lib/auth-context";
import { usePathStore } from "@/store/path";

function Header() {
  const navigate = usePathStore((state) => state.setPath);
  const user = useUser();

  return (
    <header
      className="sticky top-0 z-10 w-full flex items-center justify-between bg-background p-2 border-b border-border"
      data-tauri-drag-region=""
    >
      <img
        src="/logo_streampeek.png"
        alt="Logo StreamPeek"
        className="w-3 cursor-pointer"
        onClick={() => navigate("home")}
      />

      <img
        src={user.profile_image_url}
        alt={user.user_display_name}
        className="size-[18px] rounded-[4px] cursor-pointer object-cover"
        onClick={() => navigate("settings")}
      />
    </header>
  );
}

interface AuthenticatedLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

function Layout({ children, ...rest }: AuthenticatedLayoutProps) {
  return (
    <section className="w-full h-dvh overflow-y-auto flex flex-col" {...rest}>
      <Header />
      {children}
    </section>
  );
}

export { Layout };
