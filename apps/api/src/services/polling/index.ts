import { Queue, Worker } from "bullmq";
import { bullMQQueueConnection, bullMQWorkerConnection } from "../../lib/redis";
import { PollProcessor } from "./processor";
import { createPollScheduler } from "./scheduler";
import type { PollJobData } from "./types";

const pollQueue = new Queue<PollJobData>("stream-poll", { connection: bullMQQueueConnection });
const pollScheduler = createPollScheduler(pollQueue);
const pollProcessor = new PollProcessor();

export function createPollWorker() {
  return new Worker<PollJobData>("stream-poll", async (job) => pollProcessor.processJob(job), {
    connection: bullMQWorkerConnection,
    concurrency: 10,
  });
}

export async function scheduleUserPoll(userId: string) {
  await pollScheduler.schedule(userId);
}

export async function removeUserPoll(userId: string) {
  await pollScheduler.remove(userId);
}

export async function synchronizeUserPolls(userIds: string[]) {
  await pollScheduler.synchronize(userIds);
}

export function resetUserPollingState(userId: string) {
  pollProcessor.resetUser(userId);
}

export async function closePolling() {
  await pollQueue.close();
}
