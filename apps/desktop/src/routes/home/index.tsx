import { Layout } from "@/components/authenticated-layout";
import { StatusDot } from "@/components/ui/status-dot";
import { useOfflineSection } from "@/hooks/use-offline-section";
import { useSortedStreamers } from "@/hooks/use-sorted-streamers";
import { useStreamerNotifications } from "@/hooks/use-streamer-notifications";
import { Streamer } from "@/types/streamer";
import { ChevronDown } from "lucide-react";
import { Suspense } from "react";
import { StreamerListEmpty } from "./home-empty";
import { StreamerListSkeleton } from "./home-skeleton";
import { HomeStreamerOffline, HomeStreamerOnline } from "./home-streamer";

export function Home() {
  return (
    <Layout>
      <Suspense fallback={<StreamerListSkeleton />}>
        <StreamerList />
      </Suspense>
    </Layout>
  );
}

function StreamerList() {
  const { live, offline } = useSortedStreamers();
  const notifications = useStreamerNotifications();

  if (live.length === 0 && offline.length === 0) {
    return <StreamerListEmpty />;
  }

  return (
    <div className="flex flex-1 flex-col">
      <OnlineSection
        live={live}
        isMuted={notifications.isMuted}
        isUpdatingMutedState={notifications.isUpdating}
        onToggleMuted={notifications.toggleMuted}
      />
      <OfflineSection
        offline={offline}
        isMuted={notifications.isMuted}
        isUpdatingMutedState={notifications.isUpdating}
        onToggleMuted={notifications.toggleMuted}
      />
    </div>
  );
}

interface StreamerSectionProps {
  isMuted: (streamerId: string) => boolean;
  isUpdatingMutedState: (streamerId: string) => boolean;
  onToggleMuted: (streamer: Streamer) => Promise<void>;
}

interface OnlineSectionProps extends StreamerSectionProps {
  live: Streamer[];
}

function OnlineSection({ live, isMuted, isUpdatingMutedState, onToggleMuted }: OnlineSectionProps) {
  if (live.length === 0) return null;

  return (
    <section className="flex flex-col border-b border-border">
      <div className="flex items-center justify-between px-2 py-1">
        <div className="flex items-center gap-1">
          <StatusDot variant="online" />
          <span className="text-[10px] font-medium tracking-[0.5px] text-foreground">ONLINE</span>
        </div>
        <span className="text-[10px] font-semibold tracking-[0.5px] text-[#64fd95]">
          {live.length}
        </span>
      </div>
      <ul className="flex flex-col px-0.5 py-1">
        {live.map((streamer) => (
          <HomeStreamerOnline
            key={streamer.id}
            streamer={streamer}
            isMuted={isMuted(streamer.id)}
            isUpdatingMutedState={isUpdatingMutedState(streamer.id)}
            onToggleMuted={onToggleMuted}
          />
        ))}
      </ul>
    </section>
  );
}

interface OfflineSectionProps extends StreamerSectionProps {
  offline: Streamer[];
}

function OfflineSection({
  offline,
  isMuted,
  isUpdatingMutedState,
  onToggleMuted,
}: OfflineSectionProps) {
  const section = useOfflineSection();

  if (offline.length === 0) return null;

  return (
    <section className="flex flex-col pt-1">
      <button
        type="button"
        aria-controls="offline-streamers"
        aria-expanded={section.isExpanded}
        className="flex w-full cursor-pointer items-center justify-between px-2 py-1.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        onClick={section.toggle}
      >
        <span className="flex items-center gap-1">
          <StatusDot variant="offline" />
          <span className="text-[10px] font-medium tracking-[0.5px]">OFFLINE</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="text-[10px] font-medium tracking-[0.5px]">{offline.length}</span>
          <ChevronDown
            aria-hidden="true"
            className={`size-3 transition-transform ${section.isExpanded ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {section.isExpanded && (
        <ul id="offline-streamers" className="flex flex-col px-0.5 py-1">
          {offline.map((streamer) => (
            <HomeStreamerOffline
              key={streamer.id}
              streamer={streamer}
              isMuted={isMuted(streamer.id)}
              isUpdatingMutedState={isUpdatingMutedState(streamer.id)}
              onToggleMuted={onToggleMuted}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
