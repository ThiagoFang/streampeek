import { create } from "zustand";
import { Routes } from "../types/routing";

type State = {
  path: Routes;
};

type Actions = {
  setPath: (path: Routes) => void;
};

export const usePathStore = create<State & Actions>((set) => ({
  path: "auth",
  setPath: (path) => set({ path }),
}));
