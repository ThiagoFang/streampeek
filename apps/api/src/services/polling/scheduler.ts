import type { Queue } from "bullmq";
import type { PollJobData } from "./types";

const POLL_INTERVAL = 120_000;

type PollSchedulerQueue = Pick<
  Queue<PollJobData>,
  "upsertJobScheduler" | "removeJobScheduler" | "getJobSchedulers"
>;

export function createPollScheduler(queue: PollSchedulerQueue, interval = POLL_INTERVAL) {
  const getSchedulerId = (userId: string) => `poll-${userId}`;
  const schedule = (userId: string) =>
    queue.upsertJobScheduler(
      getSchedulerId(userId),
      { every: interval },
      {
        name: "poll",
        data: { userId },
        opts: {
          attempts: 3,
          backoff: { type: "exponential", delay: 1000 },
          removeOnComplete: { count: 0 },
          removeOnFail: { count: 50 },
        },
      },
    );

  return {
    schedule,

    remove(userId: string) {
      return queue.removeJobScheduler(getSchedulerId(userId));
    },

    async synchronize(userIds: string[]) {
      const expectedSchedulerIds = new Set(userIds.map(getSchedulerId));
      const existingSchedulers = await queue.getJobSchedulers();

      await Promise.all(
        existingSchedulers
          .filter((scheduler) => !expectedSchedulerIds.has(scheduler.key))
          .map((scheduler) => queue.removeJobScheduler(scheduler.key)),
      );

      await Promise.all(userIds.map(schedule));
    },
  };
}
