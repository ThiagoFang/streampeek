import { redis } from "../lib/redis";

interface Connection {
  abort: () => void;
  unsubscribe: () => void;
}

class ConnectionManager {
  private connections = new Map<string, Connection>();
  private userSseKeys = new Map<string, string>();

  get(userId: string): Connection | undefined {
    return this.connections.get(userId);
  }

  set(userId: string, connection: Connection) {
    this.connections.set(userId, connection);
    this.userSseKeys.set(userId, `sse:${userId}:${Date.now()}`);
  }

  delete(userId: string) {
    this.connections.delete(userId);
    this.userSseKeys.delete(userId);
  }

  async broadcastToUser(userId: string, message: string) {
    const sseKey = this.userSseKeys.get(userId);
    if (sseKey) {
      await redis.publish(sseKey, message);
    }
  }

  getAllUserIds(): string[] {
    return Array.from(this.connections.keys());
  }
}

const connectionManager = new ConnectionManager();

export function getConnectionManager() {
  return connectionManager;
}