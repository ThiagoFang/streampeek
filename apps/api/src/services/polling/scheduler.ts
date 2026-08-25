import type { Queue } from "bullmq";
import type { PollJobData } from "./types";

const POLL_INTERVAL = 120_000;

type PollSchedulerQueue = Pick<Queue<PollJobData>, "upsertJobScheduler" | "removeJobScheduler">;

export function createPollScheduler(queue: PollSchedulerQueue, interval = POLL_INTERVAL) {
  const getSchedulerId = (sessionId: string) => `poll-${sessionId}`;

  return {
    schedule(sessionId: string) {
      return queue.upsertJobScheduler(
        getSchedulerId(sessionId),
        { every: interval },
        {
          name: "poll",
          data: { sessionId },
          opts: {
            attempts: 3,
            backoff: { type: "exponential", delay: 1000 },
            removeOnComplete: { count: 0 },
            removeOnFail: { count: 50 },
          },
        },
      );
    },

    remove(sessionId: string) {
      return queue.removeJobScheduler(getSchedulerId(sessionId));
    },
  };
}
