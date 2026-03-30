export type StreamEvent = {
  type: "stream.online" | "stream.offline";
  broadcasterUserId: string;
  broadcasterUserLogin: string;
  broadcasterUserName: string;
  gameName: string;
};

export class StreamEventBus {
  private listeners = new Map<string, Set<(event: StreamEvent) => void>>();

  subscribe(userId: string, listener: (event: StreamEvent) => void) {
    if (!this.listeners.has(userId)) {
      this.listeners.set(userId, new Set());
    }

    this.listeners.get(userId)!.add(listener);

    return () => {
      const set = this.listeners.get(userId);
      if (!set) return;

      set.delete(listener);
      if (set.size === 0) this.listeners.delete(userId);
    };
  }

  emit(userId: string, event: StreamEvent) {
    const set = this.listeners.get(userId);
    if (!set) return;

    for (const listener of set) {
      listener(event);
    }
  }
}

export const streamEventBus = new StreamEventBus();
