import { StatusDot } from "@/components/ui/status-dot";
import { formatViewerCount } from "@/lib/format";
import { openTwitchChannel } from "@/lib/twitch";
import { Streamer } from "@/types/streamer";
import { User } from "lucide-react";

interface HomeStreamerProps {
  streamer: Streamer;
}

function HomeStreamerOnline({ streamer }: HomeStreamerProps) {
  const handleClick = () => openTwitchChannel(streamer.displayName.toLowerCase());

  return (
    <li
      role="button"
      tabIndex={0}
      className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-2 hover:bg-accent"
      onClick={handleClick}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
    >
      <HomeStreamerOnlineAvatar streamer={streamer} />
      <div className="flex min-w-0 flex-1 flex-col justify-center leading-3">
        <span className="truncate text-[12px] font-semibold text-foreground">
          {streamer.displayName}
        </span>
        <span className="truncate text-[10px] font-light text-muted-foreground">
          {streamer.gameName}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <User className="size-[10px] text-[#64fd95]" />
        <span className="text-[10px] font-semibold text-[#64fd95]">
          {formatViewerCount(streamer.viewerCount)}
        </span>
      </div>
    </li>
  );
}

function HomeStreamerOnlineAvatar({ streamer }: HomeStreamerProps) {
  return (
    <div className="relative shrink-0">
      <div
        className="size-7 rounded-full border border-primary p-px"
      >
        <img
          src={streamer.profileImageUrl}
          alt={streamer.displayName}
          className="size-full rounded-full object-cover"
        />
      </div>
      <StatusDot variant="online" className="absolute bottom-0 right-0" />
    </div>
  );
}

function HomeStreamerOffline({ streamer }: HomeStreamerProps) {
  const handleClick = () => openTwitchChannel(streamer.displayName.toLowerCase());

  return (
    <li
      role="button"
      tabIndex={0}
      className="flex cursor-pointer items-center gap-2 rounded-lg p-1 hover:bg-accent"
      onClick={handleClick}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
    >
      <div className="size-[18px] shrink-0 rounded-full border border-border">
        <img
          src={streamer.profileImageUrl}
          alt={streamer.displayName}
          className="size-full rounded-full object-cover opacity-50 grayscale"
        />
      </div>
      <div className="min-w-0 flex-1">
        <span className="truncate text-[12px] font-semibold text-muted-foreground">
          {streamer.displayName}
        </span>
      </div>
      <span className="ml-auto shrink-0 text-[10px] font-light text-muted-foreground">
        offline
      </span>
    </li>
  );
}

export { HomeStreamerOffline, HomeStreamerOnline };
