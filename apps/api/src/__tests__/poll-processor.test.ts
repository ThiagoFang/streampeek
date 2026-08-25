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
  let session: { userId: string; accessToken: string } | null = {
    userId: USER_ID,
    accessToken: ACCESS_TOKEN,
  };
  let channels = [CHANNEL];
  let streams: Record<string, { game_name?: string }> = {};
  let notificationsEnabled = true;
  let streamerExcluded = false;
  let followedChannelsCalls = 0;
  let streamsCalls = 0;
  let streamsGate: Promise<void> | null = null;
  const published: StreamEventDelivery[] = [];

  const processor = new PollProcessor({
    resolveSession: async () => session,
    getFollowedChannels: async () => {
      followedChannelsCalls += 1;
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
  });

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
    getStreamsCalls: () => streamsCalls,
  };
}

async function establishOfflineBaseline(harness: ReturnType<typeof createHarness>) {
  await harness.poll();
  expect(harness.published).toEqual([]);
}

describe("poll processor", () => {
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
