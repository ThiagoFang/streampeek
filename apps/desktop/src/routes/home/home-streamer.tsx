import { cn } from "@/lib/utils";
import { Streamer } from "@/types/streamer";
import { ChevronRight } from "lucide-react";

interface HomeStreamerProps {
  streamer: Streamer;
}

function HomeStreamer({ streamer }: HomeStreamerProps) {
  return (
    <li className="flex items-center gap-2.5 rounded-2xl border px-4 py-2">
      <HomeStreamerAvatar streamer={streamer} />
      <HomeStreamerInfo streamer={streamer} />
      {streamer.isLive && <HomeStreamerStatus streamer={streamer} />}
    </li>
  );
}

function HomeStreamerAvatar({ streamer }: HomeStreamerProps) {
  if (!streamer.isLive) {
    return <div className="size-[50px] shrink-0 rounded-lg bg-muted" />;
  }

  return (
    <div
      className="size-[50px] shrink-0 rounded-lg"
      style={{
        backgroundImage: "linear-gradient(225deg, var(--muted) 0%, var(--primary) 100%)",
      }}
    >
      <img
        src={streamer.profileImageUrl}
        alt={streamer.displayName}
        className="size-full rounded-lg object-cover"
      />
    </div>
  );
}

function HomeStreamerInfo({ streamer }: HomeStreamerProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1 leading-4">
      <span
        className={cn(
          "truncate text-base font-semibold",
          streamer.isLive ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {streamer.displayName}
      </span>
      <span className="truncate text-sm font-light text-muted-foreground">
        {streamer.isLive ? streamer.gameName : "Offline"}
      </span>
    </div>
  );
}

function HomeStreamerStatus({ streamer }: HomeStreamerProps) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <span className="size-[9px] rounded-full bg-[#20ff7d]" />
      <span className="text-sm text-foreground">{streamer.viewerCount.toLocaleString()}</span>
      <ChevronRight className="size-3" />
    </div>
  );
}

export { HomeStreamer };
