import { describe, expect, it } from "bun:test";
import { createAutostartService } from "../lib/autostart";

describe("autostart service", () => {
  it("reads the native state and delegates both possible changes", async () => {
    const calls: string[] = [];
    const autostart = createAutostartService({
      isEnabled: async () => {
        calls.push("read");
        return true;
      },
      enable: async () => {
        calls.push("enable");
      },
      disable: async () => {
        calls.push("disable");
      },
    });

    expect(await autostart.isEnabled()).toBe(true);
    await autostart.setEnabled(true);
    await autostart.setEnabled(false);

    expect(calls).toEqual(["read", "enable", "disable"]);
  });
});
