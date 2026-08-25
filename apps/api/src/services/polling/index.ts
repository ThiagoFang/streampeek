import { Queue, Worker } from "bullmq";
import { bullMQConnection } from "../../lib/redis";
import { PollProcessor } from "./processor";
import { createPollScheduler } from "./scheduler";
import type { PollJobData } from "./types";

const pollQueue = new Queue<PollJobData>("stream-poll", { connection: bullMQConnection });
const pollScheduler = createPollScheduler(pollQueue);
const pollProcessor = new PollProcessor();

export function createPollWorker() {
  return new Worker<PollJobData>("stream-poll", async (job) => pollProcessor.processJob(job), {
    connection: bullMQConnection,
    concurrency: 10,
  });
}

export async function scheduleUserPoll(sessionId: string) {
  await pollScheduler.schedule(sessionId);
}

export async function removeUserPoll(sessionId: string) {
  await pollScheduler.remove(sessionId);
}
