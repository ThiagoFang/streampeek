import { useUser } from "@/hooks/use-user";
import { Header } from "./header";
import { useEffect } from "react";
import { useUserStore } from "@/store/user";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

function Root({ children, ...rest }: Props) {
  const { data: user } = useUser();
  const setUser = useUserStore((state) => state.setUser);

  useEffect(() => {
    if (user) {
      setUser(user);
    }
  }, [user, setUser]);

  return (
    <section className="w-full h-dvh p-4 flex flex-col" {...rest}>
      <Header />
      {children}
    </section>
  );
}

export { Root };
