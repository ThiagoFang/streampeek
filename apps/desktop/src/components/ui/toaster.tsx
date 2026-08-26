import { useToastStore, type ToastVariant } from "@/store/toast";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

const variantStyles: Record<ToastVariant, string> = {
  error: "border-destructive/40 bg-destructive/15 text-foreground",
  success: "border-primary/40 bg-primary/15 text-foreground",
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
      className="pointer-events-none fixed right-3 bottom-3 z-50 flex flex-col items-end gap-2"
      role="region"
    >
      {toasts.map((toast) => {
        const Icon = variantIcon[toast.variant];
        return (
          <div
            key={toast.id}
            aria-atomic="true"
            className={cn(
              "pointer-events-auto flex max-w-xs animate-in items-start gap-2 rounded-lg border px-3 py-2 text-sm shadow-lg backdrop-blur-sm fade-in slide-in-from-bottom-2",
              variantStyles[toast.variant],
            )}
            role={toast.variant === "error" ? "alert" : "status"}
          >
            <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span className="flex-1 break-words">{toast.message}</span>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="opacity-60 transition-opacity hover:opacity-100"
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
