import { cn } from "@/lib/utils";
import { Streamer } from "@/types/streamer";
import { ChevronRight } from "lucide-react";

interface HomeStreamerProps {
  streamer: Streamer;
}

function HomeStreamer({ streamer }: HomeStreamerProps) {
  return (
    <li className="flex items-center gap-2 py-1">
      <HomeStreamerAvatar streamer={streamer} />
      <span
        className={cn(
          "min-w-0 truncate text-sm font-semibold leading-none",
          streamer.isLive ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {streamer.displayName}
      </span>
      {streamer.isLive && (
        <>
          <span className="truncate text-xs leading-none text-muted-foreground">
            {streamer.gameName}
          </span>
          <HomeStreamerStatus streamer={streamer} />
        </>
      )}
    </li>
  );
}

function HomeStreamerAvatar({ streamer }: HomeStreamerProps) {
  return (
    <div
      className={cn("size-7 shrink-0 rounded-md", !streamer.isLive && "grayscale opacity-50")}
      style={{
        backgroundImage: "linear-gradient(225deg, var(--muted) 0%, var(--primary) 100%)",
      }}
    >
      <img
        src={streamer.profileImageUrl}
        alt={streamer.displayName}
        className="size-full rounded-md object-cover"
      />
    </div>
  );
}

function HomeStreamerStatus({ streamer }: HomeStreamerProps) {
  return (
    <div className="ml-auto flex shrink-0 items-center gap-1">
      <span className="size-1.5 rounded-full bg-[#20ff7d]" />
      <span className="text-xs tabular-nums text-muted-foreground">
        {streamer.viewerCount.toLocaleString()}
      </span>
      <ChevronRight className="size-3" />
    </div>
  );
}

export { HomeStreamer };
