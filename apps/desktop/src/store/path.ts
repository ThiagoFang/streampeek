import { Route } from "@/navigation";
import { create } from "zustand";

type PathStore = {
  path: Route;
  setPath: (path: Route) => void;
};

function getInitialPath(): Route {
  try {
    const stored = localStorage.getItem("session-store");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.state?.sessionId) return "home";
    }
  } catch {}
  return "auth";
}

export const usePathStore = create<PathStore>((set) => ({
  path: getInitialPath(),
  setPath: (path) => set({ path }),
}));
