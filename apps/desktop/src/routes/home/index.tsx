import { Layout } from "@/components/authenticated-layout";
import { StatusDot } from "@/components/ui/status-dot";
import { useSortedStreamers } from "@/hooks/use-sorted-streamers";
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

  if (live.length === 0 && offline.length === 0) {
    return <StreamerListEmpty />;
  }

  return (
    <div className="flex flex-1 flex-col">
      <OnlineSection live={live} />
      <OfflineSection offline={offline} />
    </div>
  );
}

function OnlineSection({ live }: { live: Streamer[] }) {
  if (live.length === 0) return null;

  return (
    <section className="flex flex-col border-b bg-white/[0.03] backdrop-blur-md border-white/5">
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
    <section className="flex flex-col pt-2 bg-white/[0.03] backdrop-blur-md">
      <div className="px-2 py-1">
        <span className="text-[10px] font-medium tracking-[0.5px] text-white/20">OFFLINE</span>
      </div>
      <ul className="flex flex-col px-0.5 py-1">
        {offline.map((streamer) => (
          <HomeStreamerOffline key={streamer.id} streamer={streamer} />
        ))}
      </ul>
    </section>
  );
}

