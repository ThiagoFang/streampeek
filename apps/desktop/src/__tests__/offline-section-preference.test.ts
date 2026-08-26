import { describe, expect, it } from "bun:test";
import { createOfflineSectionPreference } from "../lib/offline-section-preference";

function createMemoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe("offline section preference", () => {
  it("starts collapsed and remembers both user choices", () => {
    const preference = createOfflineSectionPreference(createMemoryStorage());

    expect(preference.isExpanded()).toBe(false);

    preference.setExpanded(true);
    expect(preference.isExpanded()).toBe(true);

    preference.setExpanded(false);
    expect(preference.isExpanded()).toBe(false);
  });
});
