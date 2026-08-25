import { Context } from "hono";
import { streamSSE } from "hono/streaming";
import { subscribe } from "../lib/redis";
import { getConnectionManager } from "../services/connection-manager";
import { SessionResolver } from "../services/session-resolver-runtime";

export async function handleEvents(c: Context) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Session ")) return c.json({ error: "UNAUTHORIZED" }, 401);

  const sessionId = authHeader.slice(8);
  const token = await SessionResolver.bySessionId(sessionId);
  if (!token) return c.json({ error: "UNAUTHORIZED" }, 401);

  const connectionManager = getConnectionManager();

  return streamSSE(c, async (stream) => {
    const connection = await connectionManager.replace(token.user_id, async () => {
      const currentToken = await SessionResolver.bySessionId(sessionId);
      if (!currentToken || currentToken.user_id !== token.user_id) return undefined;

      const stopSubscription = await subscribe(`stream:${token.user_id}`, (message) => {
        stream.writeSSE({ data: message });
      });

      let unsubscribePromise: Promise<void> | undefined;

      return {
        abort: () => stream.abort(),
        unsubscribe: () => (unsubscribePromise ??= stopSubscription()),
      };
    });

    if (!connection) {
      stream.abort();
      return;
    }

    stream.onAbort(() => {
      void connection.unsubscribe();
      connectionManager.delete(token.user_id, connection);
    });

    while (true) {
      await stream.writeSSE({ data: "", event: "ping" });
      await stream.sleep(30000);
    }
  });
}
