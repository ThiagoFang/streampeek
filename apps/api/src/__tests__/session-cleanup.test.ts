import { describe, expect, it } from "bun:test";
import {
  createSessionCleanup,
  type ExpiredSession,
  type SessionCleanupResult,
} from "../services/session-cleanup";

const NOW = Date.UTC(2026, 0, 31);
const DAY_MS = 24 * 60 * 60 * 1000;
const RETENTION_MS = 30 * DAY_MS;
const INTERVAL_MS = DAY_MS;

function createHarness({
  sessions = [],
  failingSessionIds = [],
}: {
  sessions?: ExpiredSession[];
  failingSessionIds?: string[];
} = {}) {
  const cutoffs: Date[] = [];
  const deletionAttempts: string[] = [];
  const reportedResults: SessionCleanupResult[] = [];
  const reportedErrors: unknown[] = [];
  let scheduledOperation: (() => void) | undefined;
  let scheduledInterval: number | undefined;
  let scheduleStopped = false;

  const cleanup = createSessionCleanup({
    findExpiredBefore: async (cutoff) => {
      cutoffs.push(cutoff);
      return sessions;
    },
    deleteSession: async (sessionId) => {
      deletionAttempts.push(sessionId);
      if (failingSessionIds.includes(sessionId)) throw new Error(`Failed ${sessionId}`);
    },
    now: () => NOW,
    retentionMs: RETENTION_MS,
    intervalMs: INTERVAL_MS,
    schedule: (operation, intervalMs) => {
      scheduledOperation = operation;
      scheduledInterval = intervalMs;
      return () => {
        scheduleStopped = true;
      };
    },
    reportResult: (result) => {
      reportedResults.push(result);
    },
    reportError: (error) => {
      reportedErrors.push(error);
    },
  });

  return {
    cleanup,
    cutoffs,
    deletionAttempts,
    reportedResults,
    reportedErrors,
    triggerSchedule: () => scheduledOperation?.(),
    getScheduledInterval: () => scheduledInterval,
    isScheduleStopped: () => scheduleStopped,
  };
}

describe("session cleanup", () => {
  it("removes sessions whose expiration is older than the retention period", async () => {
    const harness = createHarness({
      sessions: [{ session_id: "session-1" }, { session_id: "session-2" }],
    });

    const result = await harness.cleanup.run();

    expect(harness.cutoffs).toEqual([new Date(NOW - RETENTION_MS)]);
    expect(harness.deletionAttempts).toEqual(["session-1", "session-2"]);
    expect(result).toEqual({ scanned: 2, removed: 2, failures: [] });
  });

  it("continues removing sessions after an individual failure", async () => {
    const harness = createHarness({
      sessions: [
        { session_id: "session-1" },
        { session_id: "broken-session" },
        { session_id: "session-2" },
      ],
      failingSessionIds: ["broken-session"],
    });

    const result = await harness.cleanup.run();

    expect(harness.deletionAttempts).toEqual(["session-1", "broken-session", "session-2"]);
    expect(result.scanned).toBe(3);
    expect(result.removed).toBe(2);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]?.sessionId).toBe("broken-session");
  });

  it("shares an in-progress cleanup between simultaneous callers", async () => {
    let releaseSearch!: (sessions: ExpiredSession[]) => void;
    const searchGate = new Promise<ExpiredSession[]>((resolve) => {
      releaseSearch = resolve;
    });
    let searchCount = 0;
    const cleanup = createSessionCleanup({
      findExpiredBefore: async () => {
        searchCount += 1;
        return searchGate;
      },
      deleteSession: async () => undefined,
      now: () => NOW,
      retentionMs: RETENTION_MS,
      intervalMs: INTERVAL_MS,
      schedule: () => () => undefined,
      reportResult: () => undefined,
      reportError: () => undefined,
    });

    const firstRun = cleanup.run();
    const secondRun = cleanup.run();
    releaseSearch([]);

    expect(firstRun).toBe(secondRun);
    await Promise.all([firstRun, secondRun]);
    expect(searchCount).toBe(1);
  });

  it("does not overlap scheduled cleanups and waits for the current one when stopped", async () => {
    let releaseDeletion!: () => void;
    const deletionGate = new Promise<void>((resolve) => {
      releaseDeletion = resolve;
    });
    let searchCount = 0;
    let scheduledOperation: (() => void) | undefined;
    let scheduleStopped = false;
    const cleanup = createSessionCleanup({
      findExpiredBefore: async () => {
        searchCount += 1;
        return [{ session_id: "session-1" }];
      },
      deleteSession: async () => deletionGate,
      now: () => NOW,
      retentionMs: RETENTION_MS,
      intervalMs: INTERVAL_MS,
      schedule: (operation) => {
        scheduledOperation = operation;
        return () => {
          scheduleStopped = true;
        };
      },
      reportResult: () => undefined,
      reportError: () => undefined,
    });
    const stop = cleanup.start();

    scheduledOperation?.();
    scheduledOperation?.();
    const stopPromise = stop();
    let stopCompleted = false;
    void stopPromise.then(() => {
      stopCompleted = true;
    });
    await Promise.resolve();

    expect(searchCount).toBe(1);
    expect(scheduleStopped).toBe(true);
    expect(stopCompleted).toBe(false);

    releaseDeletion();
    await stopPromise;
    expect(stopCompleted).toBe(true);

    scheduledOperation?.();
    await Promise.resolve();
    expect(searchCount).toBe(1);
  });

  it("reports scheduled results and stops the timer", async () => {
    const harness = createHarness({ sessions: [{ session_id: "session-1" }] });
    const stop = harness.cleanup.start();

    expect(harness.getScheduledInterval()).toBe(INTERVAL_MS);
    harness.triggerSchedule();
    await Bun.sleep(0);
    await stop();

    expect(harness.reportedResults).toEqual([{ scanned: 1, removed: 1, failures: [] }]);
    expect(harness.reportedErrors).toEqual([]);
    expect(harness.isScheduleStopped()).toBe(true);
  });
});
