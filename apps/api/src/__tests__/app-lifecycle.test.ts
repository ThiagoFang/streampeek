import { describe, expect, it } from "bun:test";
import { createApplicationLifecycle, type CloseResource } from "../app-lifecycle";

function createHarness({ failingResource }: { failingResource?: string } = {}) {
  const calls: string[] = [];
  const closeResource = (name: string): CloseResource => ({
    name,
    close: async () => {
      calls.push(`close:${name}`);
      if (failingResource === name) throw new Error(`${name} unavailable`);
    },
  });

  const lifecycle = createApplicationLifecycle({
    loadPollingUserIds: async () => {
      calls.push("load-users");
      return ["user-1", "user-2"];
    },
    synchronizePolls: async (userIds) => {
      calls.push(`synchronize:${userIds.join(",")}`);
    },
    createPollWorker: () => {
      calls.push("start-worker");
      return {
        close: async () => {
          calls.push("close:worker");
          if (failingResource === "worker") throw new Error("worker unavailable");
        },
      };
    },
    startCleanupJob: () => {
      calls.push("start-cleanup");
      return () => {
        calls.push("close:cleanup");
        if (failingResource === "cleanup") throw new Error("cleanup unavailable");
      };
    },
    closeResources: [closeResource("polling"), closeResource("connections"), closeResource("db")],
  });

  return { lifecycle, calls };
}

describe("application lifecycle", () => {
  it("starts polling only after synchronizing the existing users", async () => {
    const harness = createHarness();

    const result = await harness.lifecycle.start();

    expect(result).toEqual({ scheduledUserCount: 2 });
    expect(harness.calls).toEqual([
      "load-users",
      "synchronize:user-1,user-2",
      "start-worker",
      "start-cleanup",
    ]);
  });

  it("shares one startup between simultaneous callers", async () => {
    const harness = createHarness();

    await Promise.all([harness.lifecycle.start(), harness.lifecycle.start()]);

    expect(harness.calls.filter((call) => call === "start-worker")).toHaveLength(1);
  });

  it("closes every resource once and in dependency order", async () => {
    const harness = createHarness();
    await harness.lifecycle.start();
    harness.calls.length = 0;

    await Promise.all([harness.lifecycle.shutdown(), harness.lifecycle.shutdown()]);

    expect(harness.calls).toEqual([
      "close:cleanup",
      "close:worker",
      "close:polling",
      "close:connections",
      "close:db",
    ]);
  });

  it("continues closing resources after one of them fails", async () => {
    const harness = createHarness({ failingResource: "polling" });
    await harness.lifecycle.start();
    harness.calls.length = 0;

    await expect(harness.lifecycle.shutdown()).rejects.toThrow("Application shutdown failed");

    expect(harness.calls).toEqual([
      "close:cleanup",
      "close:worker",
      "close:polling",
      "close:connections",
      "close:db",
    ]);
  });

  it("waits for an in-progress startup before closing its resources", async () => {
    const calls: string[] = [];
    let releaseSynchronization!: () => void;
    const synchronizationGate = new Promise<void>((resolve) => {
      releaseSynchronization = resolve;
    });
    const lifecycle = createApplicationLifecycle({
      loadPollingUserIds: async () => ["user-1"],
      synchronizePolls: async () => {
        calls.push("synchronizing");
        await synchronizationGate;
      },
      createPollWorker: () => {
        calls.push("start-worker");
        return {
          close: async () => {
            calls.push("close-worker");
          },
        };
      },
      startCleanupJob: () => () => undefined,
      closeResources: [],
    });

    const start = lifecycle.start();
    const shutdown = lifecycle.shutdown();
    releaseSynchronization();
    await Promise.all([start, shutdown]);

    expect(calls).toEqual(["synchronizing", "start-worker", "close-worker"]);
  });

  it("cleans global resources even when startup fails", async () => {
    const calls: string[] = [];
    const lifecycle = createApplicationLifecycle({
      loadPollingUserIds: async () => {
        throw new Error("database unavailable");
      },
      synchronizePolls: async () => undefined,
      createPollWorker: () => ({ close: async () => undefined }),
      startCleanupJob: () => () => undefined,
      closeResources: [
        {
          name: "global resource",
          close: async () => {
            calls.push("closed");
          },
        },
      ],
    });

    await expect(lifecycle.start()).rejects.toThrow("database unavailable");
    await lifecycle.shutdown();

    expect(calls).toEqual(["closed"]);
  });
});
