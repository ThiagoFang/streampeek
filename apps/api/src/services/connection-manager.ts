export interface Connection {
  abort: () => void;
  unsubscribe: () => Promise<void>;
}

export class ConnectionManager {
  private connections = new Map<string, Connection>();

  get(userId: string): Connection | undefined {
    return this.connections.get(userId);
  }

  set(userId: string, connection: Connection) {
    this.connections.set(userId, connection);
  }

  delete(userId: string, expectedConnection?: Connection) {
    if (expectedConnection && this.connections.get(userId) !== expectedConnection) return;
    this.connections.delete(userId);
  }

  async close(userId: string) {
    const connection = this.connections.get(userId);
    if (!connection) return;

    this.connections.delete(userId);
    connection.abort();
    await connection.unsubscribe();
  }
}

const connectionManager = new ConnectionManager();

export function getConnectionManager() {
  return connectionManager;
}
