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
  const existing = connectionManager.get(token.user_id);
  if (existing) {
    existing.unsubscribe();
  }

  return streamSSE(c, async (stream) => {
    const unsubscribe = await subscribe(`stream:${token.user_id}`, (message) => {
      stream.writeSSE({ data: message });
    });

    connectionManager.set(token.user_id, {
      abort: () => stream.abort(),
      unsubscribe,
    });

    stream.onAbort(() => {
      unsubscribe();
      connectionManager.delete(token.user_id);
    });

    while (true) {
      await stream.writeSSE({ data: "", event: "ping" });
      await stream.sleep(30000);
    }
  });
}