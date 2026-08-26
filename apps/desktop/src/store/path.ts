import type { Route } from "@/navigation";
import { create } from "zustand";

type PathStore = {
  path: Route;
  setPath: (path: Route) => void;
};

export const usePathStore = create<PathStore>((set) => ({
  path: "home",
  setPath: (path) => set({ path }),
}));
