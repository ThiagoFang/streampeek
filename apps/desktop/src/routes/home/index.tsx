import { Layout } from "@/components/authenticated-layout";
import { StatusDot } from "@/components/ui/status-dot";
import { useSortedStreamers } from "@/hooks/use-sorted-streamers";
import { useStreamerNotifications } from "@/hooks/use-streamer-notifications";
import { Streamer } from "@/types/streamer";
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
      <OfflineFooter offline={offline} />
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
  if (offline.length === 0) return null;

  return (
    <section className="flex flex-col pt-2">
      <div className="px-2 py-1">
        <span className="text-[10px] font-medium tracking-[0.5px] text-muted-foreground">
          OFFLINE
        </span>
      </div>
      <ul className="flex flex-col px-0.5 py-1">
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
    </section>
  );
}

function OfflineFooter({ offline }: { offline: Streamer[] }) {
  if (offline.length === 0) return null;

  return (
    <footer className="sticky bottom-0 z-50 mt-auto flex items-center gap-1.5 border-t border-border bg-background px-3 py-2">
      <StatusDot variant="offline" />
      <span className="text-[10px] font-medium tracking-[0.5px] text-muted-foreground">
        {offline.length} OFFLINE
      </span>
    </footer>
  );
}
