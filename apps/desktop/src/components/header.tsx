import { userApi } from "@/api/user";
import { usePathStore } from "@/store/path";
import { useUserStore } from "@/store/user";
import { useMutation, useQueryClient } from "@tanstack/react-query";

function Header() {
  const navigate = usePathStore((state) => state.setPath);
  const user = useUserStore((state) => state.user);
  const clearUser = useUserStore((state) => state.clearUser);
  const queryClient = useQueryClient();

  const { mutate: logout } = useMutation({
    mutationFn: userApi.logout,
    onSuccess: () => {
      clearUser();
      queryClient.clear();
      navigate("auth");
    },
  });

  function handleOpenHome() {
    navigate("home");
  }

  if (!user) return null;

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

export { Header };
