import { StatusDot } from "@/components/ui/status-dot";
import { formatViewerCount } from "@/lib/format";
import { openTwitchChannel } from "@/lib/twitch";
import { cn } from "@/lib/utils";
import { Streamer } from "@/types/streamer";
import { Bell, BellOff, User } from "lucide-react";

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
    <li className="group flex items-center rounded-lg hover:bg-accent">
      <button
        type="button"
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg px-1 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={handleClick}
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
          <User aria-hidden="true" className="size-[10px] text-[#64fd95]" />
          <span className="text-[10px] font-semibold text-[#64fd95]">
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
      <div className="size-7 rounded-full border border-primary p-px">
        <img
          src={streamer.profileImageUrl}
          alt=""
          className="size-full rounded-full object-cover"
        />
      </div>
      <StatusDot variant="online" className="absolute bottom-0 right-0" />
    </div>
  );
}

function HomeStreamerOffline(props: HomeStreamerProps) {
  const { streamer } = props;
  const handleClick = () => openTwitchChannel(streamer.channelSlug);

  return (
    <li className="group flex items-center rounded-lg hover:bg-accent">
      <button
        type="button"
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg p-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={handleClick}
      >
        <div className="size-[18px] shrink-0 rounded-full border border-border">
          <img
            src={streamer.profileImageUrl}
            alt=""
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
        "mr-0.5 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-opacity hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-50",
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
