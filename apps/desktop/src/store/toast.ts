import { create } from "zustand";

export type ToastVariant = "error" | "info" | "success";

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastStoreState {
  toasts: ToastItem[];
}

interface ToastStoreActions {
  push: (input: { message: string; variant?: ToastVariant; durationMs?: number }) => number;
  dismiss: (id: number) => void;
}

type ToastStore = ToastStoreState & ToastStoreActions;

let nextId = 1;
const DEFAULT_DURATION_MS = 5000;

export const useToastStore = create<ToastStore>()((set, get) => ({
  toasts: [],
  push: ({ message, variant = "error", durationMs = DEFAULT_DURATION_MS }) => {
    const id = nextId++;
    set((state) => ({ toasts: [...state.toasts, { id, message, variant }] }));
    setTimeout(() => get().dismiss(id), durationMs);
    return id;
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export const Toast = {
  error: (message: string) => useToastStore.getState().push({ message, variant: "error" }),
  info: (message: string) => useToastStore.getState().push({ message, variant: "info" }),
  success: (message: string) => useToastStore.getState().push({ message, variant: "success" }),
};
