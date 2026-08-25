import { Queue, Worker } from "bullmq";
import { DbNotificationExclusion } from "../../db/queries/notification-exclusion";
import { DbUserSettings } from "../../db/queries/user-settings";
import { bullMQQueueConnection, bullMQWorkerConnection, redis } from "../../lib/redis";
import { SessionResolver } from "../session-resolver-runtime";
import { TwitchStreamerClient } from "../streamer";
import { PollProcessor } from "./processor";
import { createPollScheduler } from "./scheduler";
import type { PollJobData } from "./types";

const pollQueue = new Queue<PollJobData>("stream-poll", { connection: bullMQQueueConnection });
const pollScheduler = createPollScheduler(pollQueue);
const pollProcessor = new PollProcessor({
  resolveSession: async (userId) => {
    const token = await SessionResolver.byUserId(userId);
    return token ? { userId: token.user_id, accessToken: token.access_token } : null;
  },
  getFollowedChannels: TwitchStreamerClient.getFollowedChannels,
  getStreams: TwitchStreamerClient.getStreams,
  getNotificationsEnabled: async (userId) => {
    const settings = await DbUserSettings.getByUserId(userId);
    return settings.notifications_enabled;
  },
  isStreamerExcluded: DbNotificationExclusion.isExcluded,
  publishEvent: async (userId, event) => {
    await redis.publish(`stream:${userId}`, JSON.stringify(event));
  },
});

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

export async function resetUserPollingState(userId: string) {
  await pollProcessor.resetUser(userId);
}

export async function closePolling() {
  await pollQueue.close();
}
