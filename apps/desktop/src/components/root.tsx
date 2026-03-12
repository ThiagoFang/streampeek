import { Header } from "./header";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

function Root({ children, ...rest }: Props) {
  return (
    <section className="w-full h-dvh p-4 flex flex-col" {...rest}>
      <Header />
      {children}
    </section>
  );
}

export { Root };
