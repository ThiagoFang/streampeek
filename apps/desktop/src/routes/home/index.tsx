import { Layout } from "@/components/authenticated-layout";
import { useFollowedStreamers } from "@/hooks/use-followed-streamers";
import { cn } from "@/lib/utils";
import type { Streamer } from "@streampeek/shared/types/streamer";
import { Suspense } from "react";

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

  if (streamers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum streamer seguido encontrado.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-1">
      {streamers.map((streamer) => (
        <StreamerItem key={streamer.id} streamer={streamer} />
      ))}
    </ul>
  );
}

function StreamerItem({ streamer }: { streamer: Streamer }) {
  return (
    <li className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors">
      <span
        className={cn(
          "size-2 rounded-full shrink-0",
          streamer.isLive ? "bg-green-500" : "bg-muted-foreground/40",
        )}
      />
      <span className="text-sm truncate">{streamer.displayName}</span>
      {streamer.isLive && (
        <span className="text-xs text-muted-foreground ml-auto shrink-0">
          {streamer.viewerCount.toLocaleString()}
        </span>
      )}
    </li>
  );
}

function StreamerListSkeleton() {
  return (
    <div className="flex flex-col gap-1">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 px-2 py-1.5">
          <div className="size-2 rounded-full bg-muted animate-pulse" />
          <div className="h-4 w-24 rounded bg-muted animate-pulse" />
        </div>
      ))}
    </div>
  );
}
