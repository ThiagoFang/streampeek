function StreamerListSkeleton() {
  return (
    <div className="flex flex-1 flex-col">
      <section className="flex flex-col border-b bg-white/[0.03] backdrop-blur-md border-white/5">
        <div className="flex items-center justify-between px-2 py-1">
          <div className="h-2.5 w-14 animate-pulse rounded bg-background" />
          <div className="h-2.5 w-4 animate-pulse rounded bg-background" />
        </div>
        <div className="flex flex-col px-0.5 py-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 px-1 py-2">
              <div className="size-6 shrink-0 animate-pulse rounded-full bg-background" />
              <div className="flex flex-1 flex-col gap-1">
                <div className="h-3 w-20 animate-pulse rounded bg-background" />
                <div className="h-2.5 w-28 animate-pulse rounded bg-background" />
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="flex flex-col mt-2 bg-white/[0.03] backdrop-blur-md">
        <div className="px-2 py-1">
          <div className="h-2.5 w-14 animate-pulse rounded bg-background" />
        </div>
        <div className="flex flex-col px-0.5 py-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 p-1">
              <div className="size-[18px] shrink-0 animate-pulse rounded-full bg-background" />
              <div className="h-3 w-20 animate-pulse rounded bg-background" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export { StreamerListSkeleton };
