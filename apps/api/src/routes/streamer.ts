import { Hono } from "hono";
import { TwitchAuth } from "../services/twitch-auth";
import { TwitchStreamer } from "../services/streamer";

export const streamer = new Hono().get("/streamers/followed", async (c) => {
  const token = await TwitchAuth.getStoredToken();
  if (!token) return c.json({ error: "UNAUTHORIZED" }, 401);

  const streamers = await TwitchStreamer.getFollowedStreamers(
    token.user_id,
    token.access_token,
  );

  return c.json({ data: streamers });
});
