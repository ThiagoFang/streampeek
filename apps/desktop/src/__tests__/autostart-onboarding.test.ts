import { describe, expect, it } from "bun:test";
import { createAutostartOnboardingPreference } from "../lib/autostart-onboarding";

function createMemoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe("autostart onboarding preference", () => {
  it("shows the choice after login until the user answers it", () => {
    const preference = createAutostartOnboardingPreference(createMemoryStorage());

    expect(preference.shouldShow()).toBe(false);
    preference.request();
    expect(preference.shouldShow()).toBe(true);
    preference.complete();
    expect(preference.shouldShow()).toBe(false);
  });

  it("does not ask again after the choice was completed", () => {
    const preference = createAutostartOnboardingPreference(createMemoryStorage());

    preference.request();
    preference.complete();
    preference.request();

    expect(preference.shouldShow()).toBe(false);
  });
});
