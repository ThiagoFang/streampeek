import { type } from "arktype";
import { AuthHandshake } from "../services/auth-handshake-runtime";
import { AuthSession } from "../services/auth-session-runtime";
import { TwitchAuth } from "../services/twitch-auth-runtime";
import { publicProcedure, protectedProcedure } from "./procedures";

export const authRouter = {
  getAuthUrl: publicProcedure.handler(async () => {
    const state = await AuthHandshake.begin();
    const url = TwitchAuth.getAuthorizationUrl(state);
    return { url, state };
  }),

  getStatus: publicProcedure.input(type({ state: "string" })).handler(async ({ input }) => {
    const sessionId = await AuthHandshake.claimSession(input.state);
    if (!sessionId) return { authenticated: false as const };
    return { authenticated: true as const, session_id: sessionId };
  }),

  cancelLogin: publicProcedure.input(type({ state: "string > 0" })).handler(async ({ input }) => {
    const sessionId = await AuthHandshake.cancel(input.state);
    if (sessionId) await AuthSession.delete(sessionId);
    return { canceled: true as const };
  }),

  getMe: protectedProcedure.handler(({ context }) => ({
    user_id: context.token.user_id,
    user_login: context.token.user_login,
    user_display_name: context.token.user_display_name,
    profile_image_url: context.token.profile_image_url,
  })),

  logout: protectedProcedure.handler(async ({ context }) =>
    AuthSession.delete(context.token.session_id),
  ),
};
