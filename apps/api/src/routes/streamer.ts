import { Hono } from "hono";
import { TwitchStreamer } from "../services/streamer";
import { authMiddleware, type AuthEnv } from "../middleware/auth";

export const streamer = new Hono<AuthEnv>()
  .use(authMiddleware)
  .get("/streamers/followed", async (c) => {
    const token = c.get("token");

    const streamers = await TwitchStreamer.getFollowedStreamers(
      token.user_id,
      token.access_token,
    );

    return c.json({ data: streamers });
  });
