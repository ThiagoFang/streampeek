import { MeResponse } from "@/types/auth";
import { create } from "zustand";

type UserContent = {
  user: MeResponse | undefined;
}

type UserAction = {
  setUser: (user: MeResponse) => void;
  clearUser: () => void;
}

type UserStore = UserContent & UserAction;

export const useUserStore = create<UserStore>((set) => ({
  user: undefined,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: undefined }),
}))