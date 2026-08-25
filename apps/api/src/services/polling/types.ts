export interface PollJobData {
  sessionId: string;
}

export interface LiveStreamer {
  login: string;
  name: string;
  gameName: string;
}

export type LiveStreamerSet = Map<string, LiveStreamer>;

export interface StreamEvent {
  type: "stream.online" | "stream.offline";
  broadcasterUserId: string;
  broadcasterUserLogin: string;
  broadcasterUserName: string;
  gameName: string;
}

export interface StreamEventDelivery extends StreamEvent {
  shouldNotify: boolean;
}
