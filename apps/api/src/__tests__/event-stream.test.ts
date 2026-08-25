import { describe, expect, it } from "bun:test";
import {
  createEventStreamService,
  type EventMessage,
  type EventStream,
} from "../services/event-stream";

const SESSION = { sessionId: "session-1", userId: "user-1" };
const HEARTBEAT_INTERVAL_MS = 30_000;

class FakeStream implements EventStream {
  aborted = false;
  writes: EventMessage[] = [];
  sleepCalls: number[] = [];
  failMessageData: string | undefined;
  private abortListeners: Array<() => void> = [];

  async write(message: EventMessage) {
    this.writes.push(message);
    if (message.data === this.failMessageData) throw new Error("write failed");
  }

  async sleep(milliseconds: number) {
    this.sleepCalls.push(milliseconds);
    this.abort();
  }

  onAbort(listener: () => void) {
    this.abortListeners.push(listener);
  }

  abort() {
    if (this.aborted) return;
    this.aborted = true;
    for (const listener of this.abortListeners) listener();
  }
}

function createHarness() {
  let resolvedUserId: string | null = SESSION.userId;
  let messageHandler: ((message: string) => void) | undefined;
  let subscribeImplementation: (() => Promise<() => Promise<unknown>>) | undefined;
  const subscribedUsers: string[] = [];
  const deletedConnections: string[] = [];
  const reportedErrors: unknown[] = [];
  let unsubscribeCount = 0;

  const service = createEventStreamService({
    resolveUserId: async () => resolvedUserId,
    subscribe: async (userId, handler) => {
      subscribedUsers.push(userId);
      messageHandler = handler;
      if (subscribeImplementation) return subscribeImplementation();
      return async () => {
        unsubscribeCount += 1;
      };
    },
    replaceConnection: async (_userId, createConnection) => createConnection(),
    deleteConnection: (userId) => {
      deletedConnections.push(userId);
    },
    heartbeatIntervalMs: HEARTBEAT_INTERVAL_MS,
    reportError: (error) => {
      reportedErrors.push(error);
    },
  });

  return {
    service,
    subscribedUsers,
    deletedConnections,
    reportedErrors,
    getUnsubscribeCount: () => unsubscribeCount,
    sendMessage: (message: string) => messageHandler?.(message),
    setResolvedUserId: (userId: string | null) => {
      resolvedUserId = userId;
    },
    setSubscribeImplementation: (implementation: () => Promise<() => Promise<unknown>>) => {
      subscribeImplementation = implementation;
    },
  };
}

describe("event stream service", () => {
  it("authorizes only sessions that resolve to a user", async () => {
    const harness = createHarness();

    expect(await harness.service.authorize(SESSION.sessionId)).toEqual(SESSION);

    harness.setResolvedUserId(null);
    expect(await harness.service.authorize("invalid-session")).toBeNull();
  });

  it("delivers Redis messages before heartbeats and cleans up after abort", async () => {
    const harness = createHarness();
    const stream = new FakeStream();
    let stopSubscriptionCalls = 0;
    harness.setSubscribeImplementation(async () => {
      harness.sendMessage("stream-event");
      return async () => {
        stopSubscriptionCalls += 1;
      };
    });

    await harness.service.connect(SESSION, stream);

    expect(harness.subscribedUsers).toEqual([SESSION.userId]);
    expect(stream.writes).toEqual([{ data: "stream-event" }, { data: "", event: "ping" }]);
    expect(stream.sleepCalls).toEqual([HEARTBEAT_INTERVAL_MS]);
    expect(stopSubscriptionCalls).toBe(1);
    expect(harness.deletedConnections).toEqual([SESSION.userId]);
  });

  it("rejects a connection when the session becomes invalid during setup", async () => {
    const harness = createHarness();
    const stream = new FakeStream();
    harness.setResolvedUserId(null);

    await harness.service.connect(SESSION, stream);

    expect(stream.aborted).toBe(true);
    expect(harness.subscribedUsers).toEqual([]);
  });

  it("cleans a subscription created after the desktop already disconnected", async () => {
    const harness = createHarness();
    const stream = new FakeStream();
    let releaseSubscription!: () => void;
    let markSubscriptionStarted!: () => void;
    const subscriptionStarted = new Promise<void>((resolve) => {
      markSubscriptionStarted = resolve;
    });
    const subscriptionGate = new Promise<void>((resolve) => {
      releaseSubscription = resolve;
    });
    let stopSubscriptionCalls = 0;
    harness.setSubscribeImplementation(async () => {
      markSubscriptionStarted();
      await subscriptionGate;
      return async () => {
        stopSubscriptionCalls += 1;
      };
    });

    const connection = harness.service.connect(SESSION, stream);
    await subscriptionStarted;
    stream.abort();
    releaseSubscription();
    await connection;

    expect(stopSubscriptionCalls).toBe(1);
    expect(harness.deletedConnections).toEqual([SESSION.userId]);
  });

  it("reports a failed write and continues with later messages", async () => {
    const harness = createHarness();
    const stream = new FakeStream();
    stream.failMessageData = "broken-event";
    harness.setSubscribeImplementation(async () => {
      harness.sendMessage("broken-event");
      return async () => undefined;
    });

    await harness.service.connect(SESSION, stream);

    expect(stream.writes).toEqual([{ data: "broken-event" }, { data: "", event: "ping" }]);
    expect(harness.reportedErrors).toHaveLength(1);
    expect(harness.deletedConnections).toEqual([SESSION.userId]);
  });
});
