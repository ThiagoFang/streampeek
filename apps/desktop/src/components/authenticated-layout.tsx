import { useUser } from "@/lib/auth";
import { usePathStore } from "@/store/path";

function Header() {
  const navigate = usePathStore((state) => state.setPath);
  const user = useUser();

  return (
    <header
      className="sticky top-0 z-50 w-full flex items-center justify-between bg-background p-2 border-b border-border"
      data-tauri-drag-region=""
    >
      <button
        type="button"
        aria-label="Abrir início"
        className="flex size-6 cursor-pointer items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => navigate("home")}
      >
        <img src="/logo_streampeek.png" alt="" className="w-3" />
      </button>

      <button
        type="button"
        aria-label="Abrir configurações"
        className="flex size-6 cursor-pointer items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => navigate("settings")}
      >
        <img
          src={user.profile_image_url}
          alt=""
          className="size-[18px] rounded-[4px] object-cover"
        />
      </button>
    </header>
  );
}

interface AuthenticatedLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

function Layout({ children, ...rest }: AuthenticatedLayoutProps) {
  return (
    <section className="relative w-full h-full overflow-y-auto flex flex-col" {...rest}>
      <Header />
      {children}
    </section>
  );
}

export { Layout };
