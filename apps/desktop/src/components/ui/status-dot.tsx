import { cn } from "@/lib/utils";

interface StatusDotProps {
  variant: "online" | "offline";
  className?: string;
}

function StatusDot({ variant, className }: StatusDotProps) {
  if (variant === "offline") {
    return <div className={cn("size-[5px] rounded-full bg-accent", className)} />;
  }

  return (
    <div className={cn("inline-grid place-items-start", className)}>
      <div className="col-start-1 row-start-1 size-[5px] rounded-full bg-[#64fd95] opacity-50 blur-[2px]" />
      <div className="col-start-1 row-start-1 size-[5px] rounded-full bg-[#64fd95]" />
    </div>
  );
}

export { StatusDot };
