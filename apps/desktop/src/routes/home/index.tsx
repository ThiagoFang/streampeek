import { Layout } from "@/components/authenticated-layout";
import { useFollowedStreamers } from "@/hooks/use-followed-streamers";
import { Suspense, useMemo } from "react";
import { StreamerListEmpty } from "./home-empty";
import { StreamerListSkeleton } from "./home-skeleton";
import { HomeStreamer } from "./home-streamer";

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

  const sorted = useMemo(() => {
    const live = streamers.filter((s) => s.isLive).sort((a, b) => b.viewerCount - a.viewerCount);
    const offline = streamers
      .filter((s) => !s.isLive)
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
    return [...live, ...offline];
  }, [streamers]);

  if (sorted.length === 0) {
    return <StreamerListEmpty />;
  }

  return (
    <ul className="flex flex-col gap-2 px-4 pb-4">
      {sorted.map((streamer) => (
        <HomeStreamer key={streamer.id} streamer={streamer} />
      ))}
    </ul>
  );
}
