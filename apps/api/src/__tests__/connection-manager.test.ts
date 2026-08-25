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
    manager.set("user-1", fake.connection);

    await manager.close("user-1");

    expect(fake.wasAborted()).toBe(true);
    expect(fake.wasUnsubscribed()).toBe(true);
    expect(manager.get("user-1")).toBeUndefined();
  });

  it("does not let an old connection remove a newer one", () => {
    const manager = new ConnectionManager();
    const oldConnection = fakeConnection().connection;
    const newConnection = fakeConnection().connection;

    manager.set("user-1", oldConnection);
    manager.set("user-1", newConnection);
    manager.delete("user-1", oldConnection);

    expect(manager.get("user-1")).toBe(newConnection);
  });
});
