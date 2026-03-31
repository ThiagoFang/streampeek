import { Worker, Queue } from "bullmq";
import { redis, bullMQConnection } from "../lib/redis";
import { TwitchStreamer } from "./streamer";
import { TwitchAuth } from "./twitch-auth";
import { DbAuthToken } from "../db/queries/auth-token";
import { DbNotificationExclusion } from "../db/queries/notification-exclusion";

const POLL_INTERVAL = 120_000;

interface PollJobData {
  userId: string;
  sessionId: string;
}

interface StreamEvent {
  type: "stream.online" | "stream.offline";
  broadcasterUserId: string;
  broadcasterUserLogin: string;
  broadcasterUserName: string;
  gameName: string;
}

export const pollQueue = new Queue<PollJobData>("stream-poll", { connection: bullMQConnection });

class PollProcessor {
  private previousLiveSets = new Map<string, Map<string, { login: string; name: string; gameName: string }>>();

  async processJob(job: { data: PollJobData }) {
    const { sessionId } = job.data;

    const token = await DbAuthToken.getBySessionId(sessionId);
    if (!token) return;

    let accessToken = token.access_token;
    if (new Date(token.expires_at) <= new Date()) {
      const refreshed = await TwitchAuth.refreshToken(token).catch(() => null);
      if (!refreshed) return;
      accessToken = refreshed.access_token;
    }

    const channels = await TwitchStreamer.getFollowedChannels(token.user_id, accessToken);
    if (!channels.length) return;

    const broadcasterIds = channels.map((c) => c.broadcaster_id);
    const streams = await TwitchStreamer.getStreams(broadcasterIds, accessToken);
    if (!streams) return;

    const currentLiveSet = new Map<string, { login: string; name: string; gameName: string }>();
    for (const channel of channels) {
      if (streams[channel.broadcaster_id]) {
        currentLiveSet.set(channel.broadcaster_id, {
          login: channel.broadcaster_login,
          name: channel.broadcaster_name,
          gameName: streams[channel.broadcaster_id].game_name ?? "",
        });
      }
    }

    const previousLiveSet = this.previousLiveSets.get(token.user_id) || new Map();

    for (const [id, info] of currentLiveSet) {
      if (!previousLiveSet.has(id)) {
        const excluded = await DbNotificationExclusion.isExcluded(token.user_id, id);
        if (excluded) continue;

        const event: StreamEvent = {
          type: "stream.online",
          broadcasterUserId: id,
          broadcasterUserLogin: info.login,
          broadcasterUserName: info.name,
          gameName: info.gameName,
        };
        await redis.publish(`stream:${token.user_id}`, JSON.stringify(event));
      }
    }

    for (const [id, info] of previousLiveSet) {
      if (!currentLiveSet.has(id)) {
        const event: StreamEvent = {
          type: "stream.offline",
          broadcasterUserId: id,
          broadcasterUserLogin: info.login,
          broadcasterUserName: info.name,
          gameName: info.gameName,
        };
        await redis.publish(`stream:${token.user_id}`, JSON.stringify(event));
      }
    }

    this.previousLiveSets.set(token.user_id, currentLiveSet);

    await pollQueue.add(
      "poll",
      { userId: token.user_id, sessionId },
      {
        delay: POLL_INTERVAL,
        jobId: `poll-${sessionId}`,
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
      },
    );
  }
}

const pollProcessor = new PollProcessor();

export const createPollWorker = () => {
  return new Worker<PollJobData>(
    "stream-poll",
    async (job) => pollProcessor.processJob(job),
    {
      connection: bullMQConnection,
      concurrency: 10,
    },
  );
};

export const scheduleUserPoll = async (sessionId: string) => {
  const token = await DbAuthToken.getBySessionId(sessionId);
  if (!token) return;

  await pollQueue.add(
    "poll",
    { userId: token.user_id, sessionId },
    {
      delay: 5000,
      jobId: `poll-${sessionId}`,
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
    },
  );
};

export const removeUserPoll = async (sessionId: string) => {
  const job = await pollQueue.getJob(`poll-${sessionId}`);
  if (job) await job.remove();
};