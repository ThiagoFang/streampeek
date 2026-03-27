import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface SettingsStoreState {
  notificationsEnabled: boolean;
}

interface SettingsStoreActions {
  setNotificationsEnabled: (enabled: boolean) => void;
}

type SettingsStore = SettingsStoreState & SettingsStoreActions;

const initialState: SettingsStoreState = {
  notificationsEnabled: true,
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...initialState,
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
    }),
    {
      name: "settings-store",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
