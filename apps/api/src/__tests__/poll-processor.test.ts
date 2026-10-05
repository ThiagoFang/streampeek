import { describe, expect, it } from "bun:test";
import { PollProcessor } from "../services/polling/processor";
import type { StreamEventDelivery } from "../services/polling/types";

const USER_ID = "user-1";
const ACCESS_TOKEN = "access-token";
const CHANNEL = {
  broadcaster_id: "broadcaster-1",
  broadcaster_login: "streamer",
  broadcaster_name: "Streamer",
};
const LIVE_STREAM = { game_name: "Just Chatting" };

function createHarness() {
  let now = 0;
  let session: { userId: string; accessToken: string } | null = {
    userId: USER_ID,
    accessToken: ACCESS_TOKEN,
  };
  let channels = [CHANNEL];
  let streams: Record<string, { game_name?: string }> = {};
  let notificationsEnabled = true;
  let streamerExcluded = false;
  let followedChannelsCalls = 0;
  let followedChannelsError: Error | null = null;
  let streamsCalls = 0;
  let streamsGate: Promise<void> | null = null;
  const published: StreamEventDelivery[] = [];

  const processor = new PollProcessor(
    {
      resolveSession: async () => session,
      getFollowedChannels: async () => {
        followedChannelsCalls += 1;
        if (followedChannelsError) throw followedChannelsError;
        return channels;
      },
      getStreams: async () => {
        streamsCalls += 1;
        await streamsGate;
        return streams;
      },
      getNotificationsEnabled: async () => notificationsEnabled,
      isStreamerExcluded: async () => streamerExcluded,
      publishEvent: async (_userId, event) => {
        published.push(event);
      },
    },
    () => now,
  );

  return {
    processor,
    published,
    poll: () => processor.processJob({ data: { userId: USER_ID } }),
    setSession: (value: typeof session) => {
      session = value;
    },
    setChannels: (value: typeof channels) => {
      channels = value;
    },
    setStreams: (value: typeof streams) => {
      streams = value;
    },
    setStreamsGate: (value: Promise<void> | null) => {
      streamsGate = value;
    },
    setNotificationsEnabled: (value: boolean) => {
      notificationsEnabled = value;
    },
    setStreamerExcluded: (value: boolean) => {
      streamerExcluded = value;
    },
    getFollowedChannelsCalls: () => followedChannelsCalls,
    setFollowedChannelsError: (error: Error | null) => {
      followedChannelsError = error;
    },
    getStreamsCalls: () => streamsCalls,
    advanceTime: (milliseconds: number) => {
      now += milliseconds;
    },
  };
}

async function establishOfflineBaseline(harness: ReturnType<typeof createHarness>) {
  await harness.poll();
  expect(harness.published).toEqual([]);
}

describe("poll processor", () => {
  it("bounds the follows cache and isolates it per user", async () => {
    let calls = 0;
    const processor = new PollProcessor(
      {
        resolveSession: async (userId) => ({ userId, accessToken: ACCESS_TOKEN }),
        getFollowedChannels: async () => {
          calls += 1;
          return [];
        },
        getStreams: async () => ({}),
        getNotificationsEnabled: async () => true,
        isStreamerExcluded: async () => false,
        publishEvent: async () => {},
      },
      () => 0,
    );
    for (let i = 0; i < 101; i += 1) {
      await processor.processJob({ data: { userId: `user-${i}` } });
    }
    await processor.processJob({ data: { userId: "user-100" } });
    expect(calls).toBe(101);
    await processor.processJob({ data: { userId: "user-0" } });
    expect(calls).toBe(102);
  });

  it("caches follows for ten minutes while checking live streams on every poll", async () => {
    const harness = createHarness();
    await harness.poll();
    for (let i = 0; i < 4; i += 1) {
      harness.advanceTime(120_000);
      await harness.poll();
    }
    expect(harness.getFollowedChannelsCalls()).toBe(1);
    expect(harness.getStreamsCalls()).toBe(5);
    harness.advanceTime(120_000);
    await harness.poll();
    expect(harness.getFollowedChannelsCalls()).toBe(2);
  });

  it("invalidates cached follows when the session polling state is reset", async () => {
    const harness = createHarness();
    await harness.poll();
    await harness.processor.resetUser(USER_ID);
    await harness.poll();
    expect(harness.getFollowedChannelsCalls()).toBe(2);
  });

  it("retries a failed follows refresh without replacing the live baseline", async () => {
    const harness = createHarness();
    await harness.poll();
    harness.advanceTime(10 * 60_000);
    harness.setFollowedChannelsError(new Error("Twitch unavailable"));
    await expect(harness.poll()).rejects.toThrow("Twitch unavailable");
    harness.setFollowedChannelsError(null);
    harness.setStreams({ [CHANNEL.broadcaster_id]: LIVE_STREAM });
    await harness.poll();
    expect(harness.getFollowedChannelsCalls()).toBe(3);
    expect(harness.published[0]?.type).toBe("stream.online");
  });

  it("records the first poll as a baseline without announcing existing live streams", async () => {
    const harness = createHarness();
    harness.setStreams({ [CHANNEL.broadcaster_id]: LIVE_STREAM });

    await harness.poll();

    expect(harness.published).toEqual([]);
  });

  it("publishes online and offline transitions", async () => {
    const harness = createHarness();
    await establishOfflineBaseline(harness);

    harness.setStreams({ [CHANNEL.broadcaster_id]: LIVE_STREAM });
    await harness.poll();
    harness.setStreams({});
    await harness.poll();

    expect(harness.published).toEqual([
      {
        type: "stream.online",
        broadcasterUserId: CHANNEL.broadcaster_id,
        broadcasterUserLogin: CHANNEL.broadcaster_login,
        broadcasterUserName: CHANNEL.broadcaster_name,
        gameName: LIVE_STREAM.game_name,
        shouldNotify: true,
      },
      {
        type: "stream.offline",
        broadcasterUserId: CHANNEL.broadcaster_id,
        broadcasterUserLogin: CHANNEL.broadcaster_login,
        broadcasterUserName: CHANNEL.broadcaster_name,
        gameName: LIVE_STREAM.game_name,
        shouldNotify: false,
      },
    ]);
  });

  it("publishes online status without requesting a notification when notifications are disabled", async () => {
    const harness = createHarness();
    harness.setNotificationsEnabled(false);
    await establishOfflineBaseline(harness);

    harness.setStreams({ [CHANNEL.broadcaster_id]: LIVE_STREAM });
    await harness.poll();

    expect(harness.published[0]?.shouldNotify).toBe(false);
  });

  it("does not request a notification for an excluded streamer", async () => {
    const harness = createHarness();
    harness.setStreamerExcluded(true);
    await establishOfflineBaseline(harness);

    harness.setStreams({ [CHANNEL.broadcaster_id]: LIVE_STREAM });
    await harness.poll();

    expect(harness.published[0]?.shouldNotify).toBe(false);
  });

  it("stops before contacting Twitch when the session is invalid", async () => {
    const harness = createHarness();
    harness.setSession(null);

    await harness.poll();

    expect(harness.getFollowedChannelsCalls()).toBe(0);
    expect(harness.getStreamsCalls()).toBe(0);
    expect(harness.published).toEqual([]);
  });

  it("treats an empty followed-channel list as an offline state", async () => {
    const harness = createHarness();
    harness.setStreams({ [CHANNEL.broadcaster_id]: LIVE_STREAM });
    await harness.poll();

    harness.setChannels([]);
    harness.advanceTime(10 * 60_000);
    await harness.poll();

    expect(harness.getStreamsCalls()).toBe(1);
    expect(harness.published[0]).toMatchObject({
      type: "stream.offline",
      broadcasterUserId: CHANNEL.broadcaster_id,
    });
  });

  it("forgets the previous baseline after the user state is reset", async () => {
    const harness = createHarness();
    await establishOfflineBaseline(harness);
    harness.setStreams({ [CHANNEL.broadcaster_id]: LIVE_STREAM });
    await harness.poll();

    await harness.processor.resetUser(USER_ID);
    await harness.poll();

    expect(harness.published).toHaveLength(1);
  });

  it("waits for an in-progress poll before resetting the user state", async () => {
    const harness = createHarness();
    await establishOfflineBaseline(harness);
    harness.setStreams({ [CHANNEL.broadcaster_id]: LIVE_STREAM });

    let releaseStreams!: () => void;
    const streamsGate = new Promise<void>((resolve) => {
      releaseStreams = resolve;
    });
    harness.setStreamsGate(streamsGate);

    const inProgressPoll = harness.poll();
    const reset = harness.processor.resetUser(USER_ID);
    releaseStreams();
    await Promise.all([inProgressPoll, reset]);

    harness.setStreamsGate(null);
    await harness.poll();

    expect(harness.published).toHaveLength(1);
  });

  it("serializes simultaneous polls for the same user", async () => {
    const harness = createHarness();
    await establishOfflineBaseline(harness);
    harness.setStreams({ [CHANNEL.broadcaster_id]: LIVE_STREAM });

    await Promise.all([harness.poll(), harness.poll()]);

    expect(harness.published).toHaveLength(1);
  });
});
