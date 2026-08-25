import { Context } from "hono";
import { streamSSE } from "hono/streaming";
import { EventStreamService } from "../services/event-stream-runtime";

export async function handleEvents(c: Context) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Session ")) return c.json({ error: "UNAUTHORIZED" }, 401);

  const session = await EventStreamService.authorize(authHeader.slice(8));
  if (!session) return c.json({ error: "UNAUTHORIZED" }, 401);

  return streamSSE(c, async (stream) => {
    await EventStreamService.connect(session, {
      get aborted() {
        return stream.aborted;
      },
      write: (message) => stream.writeSSE(message),
      sleep: (milliseconds) => stream.sleep(milliseconds),
      onAbort: (listener) => stream.onAbort(listener),
      abort: () => stream.abort(),
    });
  });
}
