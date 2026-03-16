import { createMiddleware } from "hono/factory";
import type { Selectable } from "kysely";
import type { AuthToken } from "../db/generated/types";
import { DbAuthToken } from "../db/queries/auth-token";
import { TwitchAuth } from "../services/twitch-auth";

export type AuthEnv = {
  Variables: {
    token: Selectable<AuthToken>;
  };
};

function getSessionId(header: string | undefined) {
  if (!header?.startsWith("Session ")) return null;
  return header.slice(8);
}

export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const sessionId = getSessionId(c.req.header("Authorization"));
  if (!sessionId) return c.json({ error: "UNAUTHORIZED" }, 401);

  const token = await DbAuthToken.getBySessionId(sessionId);
  if (!token) return c.json({ error: "UNAUTHORIZED" }, 401);

  if (new Date(token.expires_at) <= new Date()) {
    const refreshed = await TwitchAuth.refreshToken(token).catch(() => null);
    if (!refreshed) return c.json({ error: "UNAUTHORIZED" }, 401);

    c.set("token", refreshed);
    await next();
    return;
  }

  c.set("token", token);
  await next();
});
