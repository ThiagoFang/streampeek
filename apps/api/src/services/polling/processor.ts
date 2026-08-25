import { DbAuthToken } from "../../db/queries/auth-token";
import { DbNotificationExclusion } from "../../db/queries/notification-exclusion";
import { DbUserSettings } from "../../db/queries/user-settings";
import { redis } from "../../lib/redis";
import { TwitchAuth } from "../twitch-auth";
import { TwitchStreamer } from "../streamer";
import { detectStreamTransitions } from "./stream-detector";
import { shouldNotify } from "./notification-policy";
import type { LiveStreamerSet, PollJobData, StreamEvent, StreamEventDelivery } from "./types";

interface PollingContext {
  userId: string;
  accessToken: string;
}

export class PollProcessor {
  private previousLiveSets = new Map<string, LiveStreamerSet>();
  private initialPollDone = new Set<string>();

  resetUser(userId: string) {
    this.previousLiveSets.delete(userId);
    this.initialPollDone.delete(userId);
  }

  async processJob(job: { data: PollJobData }) {
    const context = await this.loadPollingContext(job.data.userId);
    if (!context) return;

    const currentLiveSet = await this.loadCurrentLiveSet(context);
    if (!currentLiveSet) return;

    if (this.recordInitialBaseline(context.userId, currentLiveSet)) return;

    const previousLiveSet = this.previousLiveSets.get(context.userId) ?? new Map();
    const events = detectStreamTransitions(previousLiveSet, currentLiveSet);

    await this.publishEvents(context.userId, events);
    this.previousLiveSets.set(context.userId, currentLiveSet);
  }

  private async loadPollingContext(userId: string): Promise<PollingContext | null> {
    const token = await DbAuthToken.getByUserId(userId);
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
    if (!events.length) return;

    const settings = await DbUserSettings.getByUserId(userId);

    for (const event of events) {
      const streamerExcluded =
        event.type === "stream.online" && settings.notifications_enabled
          ? await DbNotificationExclusion.isExcluded(userId, event.broadcasterUserId)
          : false;

      const delivery: StreamEventDelivery = {
        ...event,
        shouldNotify: shouldNotify(event, {
          notificationsEnabled: settings.notifications_enabled,
          streamerExcluded,
        }),
      };

      await redis.publish(`stream:${userId}`, JSON.stringify(delivery));
    }
  }
}
