import { os } from "@orpc/server";
import { DbAuthToken } from "../db/queries/auth-token";
import { TwitchAuth } from "../services/twitch-auth";

type Context = { reqHeaders: Headers };

const base = os.$context<Context>().errors({
  UNAUTHORIZED: {},
});

const authMiddleware = base.middleware(async ({ context, next, errors }) => {
  const header = context.reqHeaders.get("Authorization");
  if (!header?.startsWith("Session ")) throw errors.UNAUTHORIZED();

  const sessionId = header.slice(8);
  const token = await DbAuthToken.getBySessionId(sessionId);
  if (!token) throw errors.UNAUTHORIZED();

  if (new Date(token.expires_at) <= new Date()) {
    const refreshed = await TwitchAuth.refreshToken(token).catch(() => null);
    if (!refreshed) throw errors.UNAUTHORIZED();
    return next({ context: { token: refreshed } });
  }

  return next({ context: { token } });
});

export const publicProcedure = base;
export const protectedProcedure = base.use(authMiddleware);
