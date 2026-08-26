import { useUser } from "@/lib/auth";
import { usePathStore } from "@/store/path";

function Header() {
  const navigate = usePathStore((state) => state.setPath);
  const user = useUser();

  return (
    <header
      className="sticky top-0 z-50 flex w-full items-center justify-between border-b border-border/70 bg-background/96 px-3 py-2.5"
      data-tauri-drag-region=""
    >
      <button
        type="button"
        aria-label="Abrir início"
        className="flex size-7 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => navigate("home")}
      >
        <img src="/logo_streampeek.png" alt="" className="h-[18px] w-auto" />
      </button>

      <button
        type="button"
        aria-label="Abrir configurações"
        className="flex size-7 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => navigate("settings")}
      >
        <img
          src={user.profile_image_url}
          alt=""
          className="size-5 rounded-md object-cover ring-1 ring-border"
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
