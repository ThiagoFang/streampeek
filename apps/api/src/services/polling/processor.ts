import { DbAuthToken } from "../../db/queries/auth-token";
import { DbNotificationExclusion } from "../../db/queries/notification-exclusion";
import { redis } from "../../lib/redis";
import { TwitchAuth } from "../twitch-auth";
import { TwitchStreamer } from "../streamer";
import { detectStreamTransitions } from "./stream-detector";
import type { LiveStreamerSet, PollJobData, StreamEvent } from "./types";

interface PollingContext {
  userId: string;
  accessToken: string;
}

export class PollProcessor {
  private previousLiveSets = new Map<string, LiveStreamerSet>();
  private initialPollDone = new Set<string>();

  async processJob(job: { data: PollJobData }) {
    const context = await this.loadPollingContext(job.data.sessionId);
    if (!context) return;

    const currentLiveSet = await this.loadCurrentLiveSet(context);
    if (!currentLiveSet) return;

    if (this.recordInitialBaseline(context.userId, currentLiveSet)) return;

    const previousLiveSet = this.previousLiveSets.get(context.userId) ?? new Map();
    const events = detectStreamTransitions(previousLiveSet, currentLiveSet);

    await this.publishEvents(context.userId, events);
    this.previousLiveSets.set(context.userId, currentLiveSet);
  }

  private async loadPollingContext(sessionId: string): Promise<PollingContext | null> {
    const token = await DbAuthToken.getBySessionId(sessionId);
    if (!token) return null;

    let accessToken = token.access_token;
    if (new Date(token.expires_at) <= new Date()) {
      const refreshed = await TwitchAuth.refreshToken(token).catch(() => null);
      if (!refreshed) return null;
      accessToken = refreshed.access_token;
    }

    return { userId: token.user_id, accessToken };
  }

  private async loadCurrentLiveSet(context: PollingContext): Promise<LiveStreamerSet | null> {
    const channels = await TwitchStreamer.getFollowedChannels(context.userId, context.accessToken);
    if (!channels.length) return null;

    const broadcasterIds = channels.map((channel) => channel.broadcaster_id);
    const streams = await TwitchStreamer.getStreams(broadcasterIds, context.accessToken);
    if (!streams) return null;

    const currentLiveSet: LiveStreamerSet = new Map();
    for (const channel of channels) {
      const stream = streams[channel.broadcaster_id];
      if (stream) {
        currentLiveSet.set(channel.broadcaster_id, {
          login: channel.broadcaster_login,
          name: channel.broadcaster_name,
          gameName: stream.game_name ?? "",
        });
      }
    }

    return currentLiveSet;
  }

  private recordInitialBaseline(userId: string, currentLiveSet: LiveStreamerSet): boolean {
    if (this.initialPollDone.has(userId)) return false;

    this.initialPollDone.add(userId);
    this.previousLiveSets.set(userId, currentLiveSet);
    return true;
  }

  private async publishEvents(userId: string, events: StreamEvent[]) {
    for (const event of events) {
      if (event.type === "stream.online") {
        const excluded = await DbNotificationExclusion.isExcluded(userId, event.broadcasterUserId);
        if (excluded) continue;
      }

      await redis.publish(`stream:${userId}`, JSON.stringify(event));
    }
  }
}
