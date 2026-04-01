import { usePathStore } from "@/store/path";

function Header() {
  const navigate = usePathStore((state) => state.setPath);

  function handleOpenHome() {
    navigate("home");
  }

  function handleOpenSettings() {
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

      <div className="size-6 rounded-md bg-primary flex items-center justify-center text-background font-bold cursor-pointer" onClick={handleOpenSettings}>
        J
      </div>
    </header>
  );
}

export { Header };