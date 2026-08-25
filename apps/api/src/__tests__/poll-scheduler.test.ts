import { afterAll, describe, expect, it } from "bun:test";
import { Queue, Worker } from "bullmq";
import { bullMQQueueConnection, bullMQWorkerConnection } from "../lib/redis";
import { createPollScheduler } from "../services/polling/scheduler";

const queueName = `stream-poll-test-${crypto.randomUUID()}`;
const queue = new Queue<{ userId: string }>(queueName, { connection: bullMQQueueConnection });
const scheduler = createPollScheduler(queue, 50);

afterAll(async () => {
  await scheduler.remove("test-user");
  await queue.obliterate({ force: true });
  await queue.close();
});

describe("poll scheduler", () => {
  it("keeps creating poll rounds until the schedule is removed", async () => {
    let completedRounds = 0;
    const worker = new Worker<{ userId: string }>(
      queueName,
      async () => {
        completedRounds += 1;
      },
      { connection: bullMQWorkerConnection },
    );

    try {
      await worker.waitUntilReady();
      await scheduler.schedule("test-user");

      const deadline = Date.now() + 2_000;
      while (completedRounds < 2 && Date.now() < deadline) {
        await Bun.sleep(20);
      }

      expect(completedRounds).toBeGreaterThanOrEqual(2);

      await scheduler.remove("test-user");
      const roundsAfterRemoval = completedRounds;
      await Bun.sleep(150);

      expect(completedRounds).toBe(roundsAfterRemoval);
    } finally {
      await worker.close();
    }
  });

  it("removes schedulers left by previous sessions", async () => {
    await queue.upsertJobScheduler(
      "poll-old-session",
      { every: 60_000 },
      { name: "poll", data: { userId: "old-format" } },
    );

    await scheduler.synchronize(["current-user"]);

    const schedulers = await queue.getJobSchedulers();
    expect(schedulers.map((item) => item.key)).toEqual(["poll-current-user"]);
    await scheduler.remove("current-user");
  });
});
