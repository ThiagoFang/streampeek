import { detectStreamTransitions } from "./stream-detector";
import { shouldNotify } from "./notification-policy";
import type { LiveStreamerSet, PollJobData, StreamEvent, StreamEventDelivery } from "./types";

interface PollingContext {
  userId: string;
  accessToken: string;
}

interface FollowedChannel {
  broadcaster_id: string;
  broadcaster_login: string;
  broadcaster_name: string;
}

interface StreamSnapshot {
  game_name?: string;
}

export interface PollProcessorDependencies {
  resolveSession: (userId: string) => Promise<PollingContext | null>;
  getFollowedChannels: (userId: string, accessToken: string) => Promise<FollowedChannel[]>;
  getStreams: (
    broadcasterIds: string[],
    accessToken: string,
  ) => Promise<Record<string, StreamSnapshot>>;
  getNotificationsEnabled: (userId: string) => Promise<boolean>;
  isStreamerExcluded: (userId: string, broadcasterId: string) => Promise<boolean>;
  publishEvent: (userId: string, event: StreamEventDelivery) => Promise<void>;
}

export class PollProcessor {
  private previousLiveSets = new Map<string, LiveStreamerSet>();
  private initialPollDone = new Set<string>();
  private userLocks = new Map<string, Promise<void>>();

  constructor(private readonly dependencies: PollProcessorDependencies) {}

  resetUser(userId: string) {
    return this.withUserLock(userId, () => {
      this.previousLiveSets.delete(userId);
      this.initialPollDone.delete(userId);
    });
  }

  processJob(job: { data: PollJobData }) {
    return this.withUserLock(job.data.userId, () => this.processUser(job.data.userId));
  }

  private async processUser(userId: string) {
    const context = await this.dependencies.resolveSession(userId);
    if (!context) return;

    const currentLiveSet = await this.loadCurrentLiveSet(context);
    if (this.recordInitialBaseline(context.userId, currentLiveSet)) return;

    const previousLiveSet = this.previousLiveSets.get(context.userId) ?? new Map();
    const events = detectStreamTransitions(previousLiveSet, currentLiveSet);

    await this.publishEvents(context.userId, events);
    this.previousLiveSets.set(context.userId, currentLiveSet);
  }

  private async loadCurrentLiveSet(context: PollingContext): Promise<LiveStreamerSet> {
    const channels = await this.dependencies.getFollowedChannels(
      context.userId,
      context.accessToken,
    );
    if (!channels.length) return new Map();

    const broadcasterIds = channels.map((channel) => channel.broadcaster_id);
    const streams = await this.dependencies.getStreams(broadcasterIds, context.accessToken);

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

    const notificationsEnabled = await this.dependencies.getNotificationsEnabled(userId);

    for (const event of events) {
      const streamerExcluded =
        event.type === "stream.online" && notificationsEnabled
          ? await this.dependencies.isStreamerExcluded(userId, event.broadcasterUserId)
          : false;

      const delivery: StreamEventDelivery = {
        ...event,
        shouldNotify: shouldNotify(event, { notificationsEnabled, streamerExcluded }),
      };

      await this.dependencies.publishEvent(userId, delivery);
    }
  }

  private async withUserLock<T>(userId: string, operation: () => Promise<T> | T): Promise<T> {
    const previous = this.userLocks.get(userId) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });

    this.userLocks.set(userId, current);
    await previous;

    try {
      return await operation();
    } finally {
      release();
      if (this.userLocks.get(userId) === current) {
        this.userLocks.delete(userId);
      }
    }
  }
}
