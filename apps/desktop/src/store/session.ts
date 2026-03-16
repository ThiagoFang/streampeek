import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface SessionStoreState {
  sessionId: string | null;
}

interface SessionStoreActions {
  setSessionId: (sessionId: string) => void;
  clearSession: () => void;
}

type SessionStore = SessionStoreState & SessionStoreActions;

const initialState: SessionStoreState = {
  sessionId: null,
};

export const useSessionStore = create<SessionStore>()(
  persist(
    (set) => ({
      ...initialState,
      setSessionId: (sessionId) => set({ sessionId }),
      clearSession: () => set(initialState),
    }),
    {
      name: "session-store",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
