export interface EventSession {
  sessionId: string;
  userId: string;
}

export interface EventMessage {
  data: string;
  event?: string;
}

export interface EventStream {
  readonly aborted: boolean;
  write: (message: EventMessage) => Promise<unknown>;
  sleep: (milliseconds: number) => Promise<unknown>;
  onAbort: (listener: () => void) => void;
  abort: () => void;
}

export interface EventConnection {
  abort: () => void;
  unsubscribe: () => Promise<void>;
}

export interface EventStreamDependencies {
  resolveUserId: (sessionId: string) => Promise<string | null>;
  subscribe: (
    userId: string,
    handler: (message: string) => void,
  ) => Promise<() => Promise<unknown>>;
  replaceConnection: (
    userId: string,
    createConnection: () => Promise<EventConnection | undefined>,
  ) => Promise<EventConnection | undefined>;
  deleteConnection: (userId: string, connection: EventConnection) => void;
  heartbeatIntervalMs: number;
  reportError: (error: unknown) => void;
}

export function createEventStreamService(dependencies: EventStreamDependencies) {
  return {
    async authorize(sessionId: string): Promise<EventSession | null> {
      const userId = await dependencies.resolveUserId(sessionId);
      return userId ? { sessionId, userId } : null;
    },

    async connect(session: EventSession, stream: EventStream) {
      let connection: EventConnection | undefined;
      let cleanupPromise: Promise<void> | undefined;
      let resolveAbort!: () => void;
      const abortSignal = new Promise<void>((resolve) => {
        resolveAbort = resolve;
      });

      const cleanup = (target: EventConnection) => {
        return (cleanupPromise ??= (async () => {
          try {
            await target.unsubscribe();
          } catch (error) {
            dependencies.reportError(error);
          }

          try {
            dependencies.deleteConnection(session.userId, target);
          } catch (error) {
            dependencies.reportError(error);
          }
        })());
      };

      stream.onAbort(() => {
        resolveAbort();
        const activeConnection = connection;
        if (activeConnection) void cleanup(activeConnection);
      });

      let writeQueue = Promise.resolve();
      const send = (message: EventMessage) => {
        const delivery = writeQueue.then(async () => {
          if (stream.aborted) return;
          await stream.write(message);
        });
        writeQueue = delivery.catch(dependencies.reportError);
        return writeQueue;
      };

      try {
        connection = await dependencies.replaceConnection(session.userId, async () => {
          const currentUserId = await dependencies.resolveUserId(session.sessionId);
          if (currentUserId !== session.userId) return undefined;

          const stopSubscription = await dependencies.subscribe(session.userId, (message) => {
            void send({ data: message });
          });
          let unsubscribePromise: Promise<void> | undefined;

          return {
            abort: () => stream.abort(),
            unsubscribe: () =>
              (unsubscribePromise ??= Promise.resolve(stopSubscription()).then(() => undefined)),
          };
        });

        if (!connection) {
          stream.abort();
          return;
        }

        if (stream.aborted) {
          await cleanup(connection);
          return;
        }

        while (!stream.aborted) {
          await send({ data: "", event: "ping" });
          if (stream.aborted) break;
          await Promise.race([stream.sleep(dependencies.heartbeatIntervalMs), abortSignal]);
        }

        await cleanup(connection);
      } catch (error) {
        dependencies.reportError(error);
        stream.abort();
        if (connection) await cleanup(connection);
      }
    },
  };
}
