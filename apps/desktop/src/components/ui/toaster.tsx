import { useToastStore, type ToastVariant } from "@/store/toast";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

const variantStyles: Record<ToastVariant, string> = {
  error: "border-destructive/40 bg-secondary text-foreground",
  success: "border-primary/40 bg-secondary text-foreground",
  info: "border-border bg-secondary text-foreground",
};

const variantIcon: Record<ToastVariant, typeof AlertCircle> = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
};

function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div
      aria-label="Notificações"
      className="pointer-events-none fixed right-3 bottom-3 left-3 z-50 flex flex-col gap-2"
      role="region"
    >
      {toasts.map((toast) => {
        const Icon = variantIcon[toast.variant];
        return (
          <div
            key={toast.id}
            aria-atomic="true"
            className={cn(
              "pointer-events-auto flex w-full animate-in items-start gap-2 rounded-xl border px-3 py-2.5 text-[12px] leading-5 shadow-lg fade-in slide-in-from-bottom-2",
              variantStyles[toast.variant],
            )}
            role={toast.variant === "error" ? "alert" : "status"}
          >
            <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span className="min-w-0 flex-1 break-words">{toast.message}</span>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Fechar notificação"
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export { Toaster };
