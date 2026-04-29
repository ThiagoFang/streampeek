export function LavaLampBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div
        className="absolute -top-10 -left-10 size-[200px] rounded-full bg-primary/30 opacity-[0.02] blur-[80px]"
        style={{ animation: "blob-float-1 65s ease-in-out infinite" }}
      />
      <div
        className="absolute top-1/3 -right-10 size-[180px] rounded-full bg-primary/30 opacity-[0.02] blur-[80px]"
        style={{ animation: "blob-float-2 75s ease-in-out infinite" }}
      />
      <div
        className="absolute bottom-0 left-1/4 size-[160px] rounded-full bg-primary/30 opacity-[0.02] blur-[80px]"
        style={{ animation: "blob-float-3 80s ease-in-out infinite" }}
      />
    </div>
  );
}
