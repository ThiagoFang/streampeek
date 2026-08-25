import { Context } from "hono";
import { streamSSE } from "hono/streaming";
import { subscribe } from "../lib/redis";
import { getConnectionManager } from "../services/connection-manager";
import { DbAuthToken } from "../db/queries/auth-token";

export async function handleEvents(c: Context) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Session ")) return c.json({ error: "UNAUTHORIZED" }, 401);

  const sessionId = authHeader.slice(8);
  const token = await DbAuthToken.getBySessionId(sessionId);
  if (!token) return c.json({ error: "UNAUTHORIZED" }, 401);

  const connectionManager = getConnectionManager();
  await connectionManager.close(token.user_id);

  return streamSSE(c, async (stream) => {
    const stopSubscription = await subscribe(`stream:${token.user_id}`, (message) => {
      stream.writeSSE({ data: message });
    });

    let unsubscribePromise: Promise<void> | undefined;
    const unsubscribe = () => (unsubscribePromise ??= stopSubscription());

    const connection = {
      abort: () => stream.abort(),
      unsubscribe,
    };
    connectionManager.set(token.user_id, connection);

    stream.onAbort(() => {
      void unsubscribe();
      connectionManager.delete(token.user_id, connection);
    });

    while (true) {
      await stream.writeSSE({ data: "", event: "ping" });
      await stream.sleep(30000);
    }
  });
}
