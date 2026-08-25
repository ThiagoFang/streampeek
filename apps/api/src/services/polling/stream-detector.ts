import type { LiveStreamer, LiveStreamerSet, StreamEvent } from "./types";

function toEvent(
  type: StreamEvent["type"],
  broadcasterUserId: string,
  streamer: LiveStreamer,
): StreamEvent {
  return {
    type,
    broadcasterUserId,
    broadcasterUserLogin: streamer.login,
    broadcasterUserName: streamer.name,
    gameName: streamer.gameName,
  };
}

export function detectStreamTransitions(
  previousLiveSet: LiveStreamerSet,
  currentLiveSet: LiveStreamerSet,
): StreamEvent[] {
  const events: StreamEvent[] = [];

  for (const [id, streamer] of currentLiveSet) {
    if (!previousLiveSet.has(id)) {
      events.push(toEvent("stream.online", id, streamer));
    }
  }

  for (const [id, streamer] of previousLiveSet) {
    if (!currentLiveSet.has(id)) {
      events.push(toEvent("stream.offline", id, streamer));
    }
  }

  return events;
}
