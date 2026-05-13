interface Connection {
  abort: () => void;
  unsubscribe: () => void;
}

class ConnectionManager {
  private connections = new Map<string, Connection>();

  get(userId: string): Connection | undefined {
    return this.connections.get(userId);
  }

  set(userId: string, connection: Connection) {
    this.connections.set(userId, connection);
  }

  delete(userId: string) {
    this.connections.delete(userId);
  }
}

const connectionManager = new ConnectionManager();

export function getConnectionManager() {
  return connectionManager;
}
