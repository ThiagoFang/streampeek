import type { StreamEventBus } from "../lib/event-bus";
import { TwitchStreamer } from "./streamer";
import { TwitchAuth } from "./twitch-auth";
import { DbAuthToken } from "../db/queries/auth-token";
import { DbNotificationExclusion } from "../db/queries/notification-exclusion";

type ChannelInfo = { login: string; name: string; gameName: string };

const POLL_INTERVAL = 120_000;

export class StreamPoller {
  private accessToken: string | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private previousLiveSet = new Map<string, ChannelInfo>();
  private isFirstPoll = true;
  private isRetrying = false;

  constructor(
    private userId: string,
    private bus: StreamEventBus,
  ) {}

  async start(accessToken: string) {
    this.stop();
    this.accessToken = accessToken;
    this.isFirstPoll = true;
    this.previousLiveSet.clear();

    await this.poll();
    this.pollTimer = setInterval(() => this.poll(), POLL_INTERVAL);
  }

  stop() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = null;
    this.accessToken = null;
    this.previousLiveSet.clear();
    this.isFirstPoll = true;
  }

  private async poll() {
    if (!this.accessToken) return;

    const channels = await TwitchStreamer.getFollowedChannels(this.userId, this.accessToken).catch(
      (err) => this.handleAuthError(err),
    );
    if (!channels) return;

    const broadcasterIds = channels.map((c) => c.broadcaster_id);
    const streams = await TwitchStreamer.getStreams(broadcasterIds, this.accessToken).catch(
      (err) => this.handleAuthError(err),
    );
    if (!streams) return;

    const currentLiveSet = new Map<string, ChannelInfo>();
    for (const channel of channels) {
      if (streams[channel.broadcaster_id]) {
        currentLiveSet.set(channel.broadcaster_id, {
          login: channel.broadcaster_login,
          name: channel.broadcaster_name,
          gameName: streams[channel.broadcaster_id].game_name ?? "",
        });
      }
    }

    if (this.isFirstPoll) {
      this.isFirstPoll = false;
      this.previousLiveSet = currentLiveSet;
      console.log(`[StreamPoller] Initial poll: ${currentLiveSet.size} channels live`);
      return;
    }

    for (const [id, info] of currentLiveSet) {
      if (this.previousLiveSet.has(id)) continue;

      const excluded = await DbNotificationExclusion.isExcluded(this.userId, id);
      if (excluded) continue;

      this.bus.emit(this.userId, {
        type: "stream.online",
        broadcasterUserId: id,
        broadcasterUserLogin: info.login,
        broadcasterUserName: info.name,
        gameName: info.gameName,
      });
    }

    for (const [id, info] of this.previousLiveSet) {
      if (!currentLiveSet.has(id)) {
        this.bus.emit(this.userId, {
          type: "stream.offline",
          broadcasterUserId: id,
          broadcasterUserLogin: info.login,
          broadcasterUserName: info.name,
          gameName: info.gameName,
        });
      }
    }

    this.previousLiveSet = currentLiveSet;
  }

  private async handleAuthError(err: unknown) {
    if (!err || typeof err !== "object" || !("status" in err) || err.status !== 401) {
      console.error("[StreamPoller] Poll failed:", err);
      return null;
    }

    const token = await DbAuthToken.getFirst();
    if (!token) return null;

    const refreshed = await TwitchAuth.refreshToken(token).catch(() => null);
    if (!refreshed) return null;

    this.accessToken = refreshed.access_token;

    if (!this.isRetrying) {
      this.isRetrying = true;
      await this.poll();
      this.isRetrying = false;
    }

    return null;
  }
}

export class PollerManager {
  private pollers = new Map<string, StreamPoller>();

  constructor(private bus: StreamEventBus) {}

  async start(accessToken: string, userId: string) {
    this.pollers.get(userId)?.stop();
    const poller = new StreamPoller(userId, this.bus);
    this.pollers.set(userId, poller);
    await poller.start(accessToken);
  }

  stop(userId: string) {
    this.pollers.get(userId)?.stop();
    this.pollers.delete(userId);
  }

  stopAll() {
    for (const poller of this.pollers.values()) poller.stop();
    this.pollers.clear();
  }
}
