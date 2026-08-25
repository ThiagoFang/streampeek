import { describe, expect, it } from "bun:test";
import { detectStreamTransitions } from "../services/polling/stream-detector";
import type { LiveStreamerSet } from "../services/polling/types";

function liveSet(entries: Array<[string, string]>): LiveStreamerSet {
  return new Map(
    entries.map(([id, name]) => [
      id,
      {
        login: name.toLowerCase(),
        name,
        gameName: `${name}'s game`,
      },
    ]),
  );
}

describe("stream transition detector", () => {
  it("reports a streamer that went online", () => {
    const events = detectStreamTransitions(new Map(), liveSet([["1", "Alice"]]));

    expect(events).toEqual([
      {
        type: "stream.online",
        broadcasterUserId: "1",
        broadcasterUserLogin: "alice",
        broadcasterUserName: "Alice",
        gameName: "Alice's game",
      },
    ]);
  });

  it("reports a streamer that went offline", () => {
    const events = detectStreamTransitions(liveSet([["1", "Alice"]]), new Map());

    expect(events).toEqual([
      {
        type: "stream.offline",
        broadcasterUserId: "1",
        broadcasterUserLogin: "alice",
        broadcasterUserName: "Alice",
        gameName: "Alice's game",
      },
    ]);
  });

  it("ignores streamers whose state did not change", () => {
    const previous = liveSet([["1", "Alice"]]);
    const current = liveSet([["1", "Alice"]]);

    expect(detectStreamTransitions(previous, current)).toEqual([]);
  });
});
