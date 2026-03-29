import { Layout } from "@/components/authenticated-layout";
import { StatusDot } from "@/components/ui/status-dot";
import { useFollowedStreamers } from "@/hooks/use-followed-streamers";
import { Streamer } from "@/types/streamer";
import { Suspense, useMemo } from "react";
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
  const { data: streamers } = useFollowedStreamers();

  const { live, offline } = useMemo(() => {
    const live = streamers.filter((s) => s.isLive).sort((a, b) => b.viewerCount - a.viewerCount);
    const offline = streamers
      .filter((s) => !s.isLive)
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
    return { live, offline };
  }, [streamers]);

  if (live.length === 0 && offline.length === 0) {
    return <StreamerListEmpty />;
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 overflow-y-auto">
        <OnlineSection live={live} />
        <OfflineSection offline={offline} />
      </div>
      {offline.length > 0 && <OfflineFooter count={offline.length} />}
    </div>
  );
}

function OnlineSection({ live }: { live: Streamer[] }) {
  if (live.length === 0) return null;

  return (
    <section className="flex flex-col border-b border-border bg-card">
      <div className="flex items-center justify-between px-2 py-1">
        <div className="flex items-center gap-1">
          <StatusDot variant="online" />
          <span className="text-[10px] font-medium tracking-[0.5px] text-white">ONLINE</span>
        </div>
        <span className="text-[10px] font-semibold tracking-[0.5px] text-[#64fd95]">
          {live.length}
        </span>
      </div>
      <ul className="flex flex-col px-0.5 py-1">
        {live.map((streamer) => (
          <HomeStreamerOnline key={streamer.id} streamer={streamer} />
        ))}
      </ul>
    </section>
  );
}

function OfflineSection({ offline }: { offline: Streamer[] }) {
  if (offline.length === 0) return null;

  return (
    <section className="flex flex-col bg-card">
      <div className="px-2 py-1">
        <span className="text-[10px] font-medium tracking-[0.5px] text-white/50">OFFLINE</span>
      </div>
      <ul className="flex flex-col px-0.5 py-1">
        {offline.map((streamer) => (
          <HomeStreamerOffline key={streamer.id} streamer={streamer} />
        ))}
      </ul>
    </section>
  );
}

function OfflineFooter({ count }: { count: number }) {
  return (
    <div className="sticky bottom-0 flex items-center gap-2 border-t border-border bg-background p-2">
      <StatusDot variant="offline" />
      <span className="text-[10px] font-semibold text-muted-foreground">
        {count} OFFLINE
      </span>
    </div>
  );
}
