import { MeResponse } from "@/types/auth";
import { create } from "zustand";

type userContent = {
  user: MeResponse | undefined;
}

type UserAction = {
  setUser: (user: MeResponse) => void;
  clearUser: () => void;
}

type UserStore = userContent & UserAction;

export const useUserStore = create<UserStore>((set) => ({
  user: undefined,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: undefined }),
}))