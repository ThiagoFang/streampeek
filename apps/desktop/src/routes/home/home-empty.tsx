import { Users } from "lucide-react";

function StreamerListEmpty() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 pb-8 text-center">
      <Users aria-hidden="true" className="size-6 text-muted-foreground" />
      <div className="flex flex-col gap-1.5">
        <p className="text-[14px] font-medium text-foreground">Nenhum canal por aqui</p>
        <p className="text-[12px] leading-5 text-muted-foreground">
          Os canais que você seguir na Twitch aparecerão nesta lista.
        </p>
      </div>
    </div>
  );
}

export { StreamerListEmpty };
