import { describe, expect, it } from "bun:test";
import { ConnectionManager } from "../services/connection-manager";

function fakeConnection() {
  let aborted = false;
  let unsubscribed = false;

  return {
    connection: {
      abort: () => {
        aborted = true;
      },
      unsubscribe: async () => {
        unsubscribed = true;
      },
    },
    wasAborted: () => aborted,
    wasUnsubscribed: () => unsubscribed,
  };
}

describe("connection manager", () => {
  it("closes and forgets a user's active connection", async () => {
    const manager = new ConnectionManager();
    const fake = fakeConnection();
    await manager.replace("user-1", async () => fake.connection);

    await manager.close("user-1");

    expect(fake.wasAborted()).toBe(true);
    expect(fake.wasUnsubscribed()).toBe(true);
    expect(manager.get("user-1")).toBeUndefined();
  });

  it("does not let an old connection remove a newer one", async () => {
    const manager = new ConnectionManager();
    const oldConnection = fakeConnection().connection;
    const newConnection = fakeConnection().connection;

    await manager.replace("user-1", async () => oldConnection);
    await manager.replace("user-1", async () => newConnection);
    manager.delete("user-1", oldConnection);

    expect(manager.get("user-1")).toBe(newConnection);
  });

  it("serializes simultaneous connection replacements", async () => {
    const manager = new ConnectionManager();
    const first = fakeConnection();
    const second = fakeConnection();
    let finishFirst!: () => void;
    const firstReady = new Promise<void>((resolve) => {
      finishFirst = resolve;
    });

    const firstReplacement = manager.replace("user-1", async () => {
      await firstReady;
      return first.connection;
    });
    const secondReplacement = manager.replace("user-1", async () => second.connection);

    finishFirst();
    await Promise.all([firstReplacement, secondReplacement]);

    expect(first.wasAborted()).toBe(true);
    expect(first.wasUnsubscribed()).toBe(true);
    expect(manager.get("user-1")).toBe(second.connection);
  });

  it("closes a connection that finishes opening during logout", async () => {
    const manager = new ConnectionManager();
    const fake = fakeConnection();
    let finishOpening!: () => void;
    const opening = new Promise<void>((resolve) => {
      finishOpening = resolve;
    });

    const replacement = manager.replace("user-1", async () => {
      await opening;
      return fake.connection;
    });
    const logout = manager.close("user-1");

    finishOpening();
    await Promise.all([replacement, logout]);

    expect(fake.wasAborted()).toBe(true);
    expect(fake.wasUnsubscribed()).toBe(true);
    expect(manager.get("user-1")).toBeUndefined();
  });

  it("closes every active connection during application shutdown", async () => {
    const manager = new ConnectionManager();
    const first = fakeConnection();
    const second = fakeConnection();

    await manager.replace("user-1", async () => first.connection);
    await manager.replace("user-2", async () => second.connection);
    await manager.closeAll();

    expect(first.wasAborted()).toBe(true);
    expect(first.wasUnsubscribed()).toBe(true);
    expect(second.wasAborted()).toBe(true);
    expect(second.wasUnsubscribed()).toBe(true);
    expect(manager.get("user-1")).toBeUndefined();
    expect(manager.get("user-2")).toBeUndefined();
  });
});
