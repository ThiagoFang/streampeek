import { create } from "zustand"

type Route = "auth" | "home" | "settings"

type PathStore = {
  path: Route
  setPath: (path: Route) => void
}

export const usePathStore = create<PathStore>((set) => ({
  path: "auth",
  setPath: (path) => set({ path }),
}))
