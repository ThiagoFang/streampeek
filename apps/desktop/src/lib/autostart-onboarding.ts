interface PreferenceStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

const STORAGE_KEY = "autostart-onboarding";
const PENDING = "pending";
const COMPLETED = "completed";

export function createAutostartOnboardingPreference(storage: PreferenceStorage) {
  return {
    request() {
      if (storage.getItem(STORAGE_KEY) !== COMPLETED) {
        storage.setItem(STORAGE_KEY, PENDING);
      }
    },

    shouldShow() {
      return storage.getItem(STORAGE_KEY) === PENDING;
    },

    complete() {
      storage.setItem(STORAGE_KEY, COMPLETED);
    },
  };
}

export const AutostartOnboardingPreference = createAutostartOnboardingPreference({
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
});
