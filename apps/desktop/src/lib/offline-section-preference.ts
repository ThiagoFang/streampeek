interface PreferenceStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

const STORAGE_KEY = "offline-section";

export function createOfflineSectionPreference(storage: PreferenceStorage) {
  return {
    isExpanded() {
      return storage.getItem(STORAGE_KEY) === "expanded";
    },

    setExpanded(expanded: boolean) {
      storage.setItem(STORAGE_KEY, expanded ? "expanded" : "collapsed");
    },
  };
}

export const OfflineSectionPreference = createOfflineSectionPreference({
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
});
