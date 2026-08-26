import { cn } from "@/lib/utils";

interface StatusDotProps {
  variant: "online" | "offline";
  className?: string;
}

function StatusDot({ variant, className }: StatusDotProps) {
  if (variant === "offline") {
    return <div className={cn("size-1.5 rounded-full bg-muted-foreground/35", className)} />;
  }

  return (
    <div className={cn("size-1.5 rounded-full bg-live shadow-[0_0_6px_#45d483]", className)} />
  );
}

export { StatusDot };
