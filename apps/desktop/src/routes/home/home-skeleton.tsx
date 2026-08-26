function StreamerListSkeleton() {
  return (
    <div role="status" aria-label="Carregando streamers" className="flex flex-1 flex-col">
      <section aria-hidden="true" className="flex flex-col border-b border-border/60">
        <div className="flex items-center justify-between px-3 pt-3 pb-1.5">
          <div className="h-3 w-16 animate-pulse rounded bg-accent" />
          <div className="h-4 w-5 animate-pulse rounded-full bg-accent" />
        </div>
        <div className="flex flex-col gap-0.5 px-1.5 pb-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2.5 px-2 py-2">
              <div className="size-8 shrink-0 animate-pulse rounded-full bg-accent" />
              <div className="flex flex-1 flex-col gap-1">
                <div className="h-3 w-24 animate-pulse rounded bg-accent" />
                <div className="h-2.5 w-16 animate-pulse rounded bg-secondary" />
              </div>
            </div>
          ))}
        </div>
      </section>
      <div aria-hidden="true" className="px-3 py-3">
        <div className="h-3 w-20 animate-pulse rounded bg-accent" />
      </div>
    </div>
  );
}

export { StreamerListSkeleton };
