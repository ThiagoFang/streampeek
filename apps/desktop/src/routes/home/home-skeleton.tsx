function StreamerListSkeleton() {
  return (
    <div className="flex flex-col gap-2 px-4 pb-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2.5 rounded-2xl border px-4 py-2">
          <div className="size-[50px] shrink-0 animate-pulse rounded-lg bg-muted" />
          <div className="flex flex-1 flex-col gap-1">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-3.5 w-32 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

export { StreamerListSkeleton };
