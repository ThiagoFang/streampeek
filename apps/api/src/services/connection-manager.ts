export interface Connection {
  abort: () => void;
  unsubscribe: () => Promise<void>;
}

export class ConnectionManager {
  private connections = new Map<string, Connection>();
  private userLocks = new Map<string, Promise<void>>();

  get(userId: string): Connection | undefined {
    return this.connections.get(userId);
  }

  delete(userId: string, expectedConnection?: Connection) {
    if (expectedConnection && this.connections.get(userId) !== expectedConnection) return;
    this.connections.delete(userId);
  }

  async replace(userId: string, createConnection: () => Promise<Connection | undefined>) {
    return this.withUserLock(userId, async () => {
      await this.closeCurrent(userId);

      const connection = await createConnection();
      if (!connection) return undefined;

      this.connections.set(userId, connection);
      return connection;
    });
  }

  close(userId: string) {
    return this.withUserLock(userId, () => this.closeCurrent(userId));
  }

  async closeAll() {
    await Promise.all([...this.connections.keys()].map((userId) => this.close(userId)));
  }

  private async closeCurrent(userId: string) {
    const connection = this.connections.get(userId);
    if (!connection) return;

    this.connections.delete(userId);
    connection.abort();
    await connection.unsubscribe();
  }

  private async withUserLock<T>(userId: string, operation: () => Promise<T>): Promise<T> {
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

const connectionManager = new ConnectionManager();

export function getConnectionManager() {
  return connectionManager;
}
