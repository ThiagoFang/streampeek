function StreamerListSkeleton() {
  return (
    <div className="flex flex-col divide-y divide-border px-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 py-1">
          <div className="size-7 shrink-0 animate-pulse rounded-md bg-muted" />
          <div className="flex flex-1 items-baseline gap-1.5">
            <div className="h-3.5 w-20 animate-pulse rounded bg-muted" />
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

export { StreamerListSkeleton };
