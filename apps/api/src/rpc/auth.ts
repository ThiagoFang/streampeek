import { type } from "arktype";
import { TwitchAuth } from "../services/twitch-auth";
import { publicProcedure, protectedProcedure } from "./procedures";

export const authRouter = {
  getAuthUrl: publicProcedure.handler(async () => {
    const state = await TwitchAuth.generateState();
    const url = TwitchAuth.getAuthorizationUrl(state);
    return { url, state };
  }),

  getStatus: publicProcedure.input(type({ state: "string" })).handler(async ({ input }) => {
    const sessionId = await TwitchAuth.claimSession(input.state);
    if (!sessionId) return { authenticated: false as const };
    return { authenticated: true as const, session_id: sessionId };
  }),

  getMe: protectedProcedure.handler(({ context }) => ({
    user_id: context.token.user_id,
    user_login: context.token.user_login,
    user_display_name: context.token.user_display_name,
    profile_image_url: context.token.profile_image_url,
  })),

  logout: protectedProcedure.handler(async ({ context }) =>
    TwitchAuth.deleteToken(context.token.session_id),
  ),
};
