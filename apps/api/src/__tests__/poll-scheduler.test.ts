import { afterAll, describe, expect, it } from "bun:test";
import { Queue, Worker } from "bullmq";
import { bullMQConnection } from "../lib/redis";
import { createPollScheduler } from "../services/polling/scheduler";

const queueName = `stream-poll-test-${crypto.randomUUID()}`;
const queue = new Queue<{ sessionId: string }>(queueName, { connection: bullMQConnection });
const scheduler = createPollScheduler(queue, 50);

afterAll(async () => {
  await scheduler.remove("test-session");
  await queue.obliterate({ force: true });
  await queue.close();
});

describe("poll scheduler", () => {
  it("keeps creating poll rounds until the schedule is removed", async () => {
    let completedRounds = 0;
    const worker = new Worker<{ sessionId: string }>(
      queueName,
      async () => {
        completedRounds += 1;
      },
      { connection: bullMQConnection },
    );

    try {
      await worker.waitUntilReady();
      await scheduler.schedule("test-session");

      const deadline = Date.now() + 2_000;
      while (completedRounds < 2 && Date.now() < deadline) {
        await Bun.sleep(20);
      }

      expect(completedRounds).toBeGreaterThanOrEqual(2);

      await scheduler.remove("test-session");
      const roundsAfterRemoval = completedRounds;
      await Bun.sleep(150);

      expect(completedRounds).toBe(roundsAfterRemoval);
    } finally {
      await worker.close();
    }
  });
});
