import { StatusDot } from "@/components/ui/status-dot";
import { formatViewerCount } from "@/lib/format";
import { openTwitchChannel } from "@/lib/twitch";
import { cn } from "@/lib/utils";
import { Streamer } from "@/types/streamer";
import { Bell, BellOff, Eye } from "lucide-react";

interface StreamerProps {
  streamer: Streamer;
}

interface HomeStreamerProps extends StreamerProps {
  isMuted: boolean;
  isUpdatingMutedState: boolean;
  onToggleMuted: (streamer: Streamer) => Promise<void>;
}

function HomeStreamerOnline(props: HomeStreamerProps) {
  const { streamer } = props;
  const handleClick = () => openTwitchChannel(streamer.channelSlug);

  return (
    <li className="group flex items-center rounded-xl transition-colors hover:bg-accent/70">
      <button
        type="button"
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-xl px-2 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={handleClick}
      >
        <HomeStreamerOnlineAvatar streamer={streamer} />
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <span className="truncate text-[13px] font-semibold leading-4 text-foreground">
            {streamer.displayName}
          </span>
          <span className="truncate text-[11px] leading-4 text-muted-foreground">
            {streamer.gameName}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1 text-muted-foreground">
          <Eye aria-hidden="true" className="size-3" />
          <span className="text-[10px] font-medium tabular-nums">
            {formatViewerCount(streamer.viewerCount)}
          </span>
        </div>
      </button>
      <NotificationToggle {...props} />
    </li>
  );
}

function HomeStreamerOnlineAvatar({ streamer }: StreamerProps) {
  return (
    <div className="relative shrink-0">
      <div className="size-8 rounded-full border border-primary/70 p-0.5">
        <img
          src={streamer.profileImageUrl}
          alt=""
          className="size-full rounded-full object-cover"
        />
      </div>
      <StatusDot variant="online" className="absolute right-0 bottom-0 ring-2 ring-background" />
    </div>
  );
}

function HomeStreamerOffline(props: HomeStreamerProps) {
  const { streamer } = props;
  const handleClick = () => openTwitchChannel(streamer.channelSlug);

  return (
    <li className="group flex items-center rounded-xl transition-colors hover:bg-accent/70">
      <button
        type="button"
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={handleClick}
      >
        <div className="size-6 shrink-0 rounded-full border border-border">
          <img
            src={streamer.profileImageUrl}
            alt=""
            className="size-full rounded-full object-cover opacity-50 grayscale"
          />
        </div>
        <div className="min-w-0 flex-1">
          <span className="truncate text-[12px] font-medium text-muted-foreground">
            {streamer.displayName}
          </span>
        </div>
      </button>
      <NotificationToggle {...props} />
    </li>
  );
}

function NotificationToggle({
  streamer,
  isMuted,
  isUpdatingMutedState,
  onToggleMuted,
}: HomeStreamerProps) {
  const Icon = isMuted ? BellOff : Bell;
  const action = isMuted ? "Reativar" : "Silenciar";

  return (
    <button
      type="button"
      aria-label={`${action} notificações de ${streamer.displayName}`}
      title={`${action} notificações`}
      className={cn(
        "mr-1 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-50",
        isMuted && "bg-accent/70",
        !isMuted &&
          "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100",
      )}
      disabled={isUpdatingMutedState}
      onClick={() => void onToggleMuted(streamer).catch(() => undefined)}
    >
      <Icon aria-hidden="true" className="size-3.5" />
    </button>
  );
}

export { HomeStreamerOffline, HomeStreamerOnline };
