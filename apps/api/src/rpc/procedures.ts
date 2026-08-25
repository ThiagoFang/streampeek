import { os } from "@orpc/server";
import { SessionResolver } from "../services/session-resolver-runtime";

type Context = { reqHeaders: Headers };

const base = os.$context<Context>().errors({
  UNAUTHORIZED: {},
});

const authMiddleware = base.middleware(async ({ context, next, errors }) => {
  const header = context.reqHeaders.get("Authorization");
  if (!header?.startsWith("Session ")) throw errors.UNAUTHORIZED();

  const sessionId = header.slice(8);
  const token = await SessionResolver.bySessionId(sessionId);
  if (!token) throw errors.UNAUTHORIZED();

  return next({ context: { token } });
});

export const publicProcedure = base;
export const protectedProcedure = base.use(authMiddleware);
