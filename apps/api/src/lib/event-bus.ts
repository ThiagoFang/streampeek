export type StreamEvent = {
  type: "stream.online" | "stream.offline";
  broadcasterUserId: string;
  broadcasterUserLogin: string;
  broadcasterUserName: string;
};

export class StreamEventBus {
  private listeners = new Set<(event: StreamEvent) => void>();

  subscribe(listener: (event: StreamEvent) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event: StreamEvent) {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

export const streamEventBus = new StreamEventBus();
