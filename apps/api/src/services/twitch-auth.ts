import axios from "redaxios";
import type { Selectable } from "kysely";
import { AuthSchemas } from "../schemas/auth";
import { envVariables } from "../lib/env";
import { redis } from "../lib/redis";
import { DbAuthToken } from "../db/queries/auth-token";
import type { AuthToken } from "../db/generated/types";

const TWITCH_SCOPES = ["user:read:email", "user:read:follows"];

const PENDING_STATE_TTL = 600;

interface LogoutContext {
  userId: string;
  sessionId: string;
}

export const TwitchAuth = {
  onLogout: null as ((context: LogoutContext) => Promise<void>) | null,

  async generateState() {
    const state = crypto.randomUUID();
    await redis.setex(`auth:pending:${state}`, PENDING_STATE_TTL, "");
    return state;
  },

  async validateState(state: string) {
    const exists = await redis.exists(`auth:pending:${state}`);
    return exists === 1;
  },

  async claimSession(state: string) {
    const sessionId = await redis.get(`auth:pending:${state}`);
    if (!sessionId) return null;
    await redis.del(`auth:pending:${state}`);
    return sessionId;
  },

  getAuthorizationUrl(state: string) {
    const params = new URLSearchParams({
      client_id: envVariables.TWITCH_CLIENT_ID,
      redirect_uri: envVariables.TWITCH_REDIRECT_URI,
      response_type: "code",
      scope: TWITCH_SCOPES.join(" "),
      state,
    });

    return `https://id.twitch.tv/oauth2/authorize?${params}`;
  },

  async exchangeCode(code: string) {
    const { data } = await axios({
      method: "POST",
      url: "https://id.twitch.tv/oauth2/token",
      data: new URLSearchParams({
        client_id: envVariables.TWITCH_CLIENT_ID,
        client_secret: envVariables.TWITCH_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: envVariables.TWITCH_REDIRECT_URI,
      }),
    });

    return AuthSchemas.tokenResponse.assert(data);
  },

  async getUser(accessToken: string) {
    const { data } = await axios<{ data: Record<string, unknown>[] }>({
      method: "GET",
      url: "https://api.twitch.tv/helix/users",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Client-Id": envVariables.TWITCH_CLIENT_ID,
      },
    });

    return AuthSchemas.twitchUser.assert(data.data[0]);
  },

  async saveToken(
    state: string,
    tokenData: typeof AuthSchemas.tokenResponse.infer,
    userData: typeof AuthSchemas.twitchUser.infer,
  ) {
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    await DbAuthToken.upsertByUserId({
      session_id: sessionId,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      user_id: userData.id,
      user_login: userData.login,
      user_display_name: userData.display_name,
      profile_image_url: userData.profile_image_url,
      expires_at: expiresAt,
    });

    await redis.set(`auth:pending:${state}`, sessionId, "EX", PENDING_STATE_TTL);
  },

  async refreshToken(token: Selectable<AuthToken>) {
    const { data } = await axios({
      method: "POST",
      url: "https://id.twitch.tv/oauth2/token",
      data: new URLSearchParams({
        client_id: envVariables.TWITCH_CLIENT_ID,
        client_secret: envVariables.TWITCH_CLIENT_SECRET,
        refresh_token: token.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    const validated = AuthSchemas.tokenResponse.assert(data);
    const expiresAt = new Date(Date.now() + validated.expires_in * 1000);

    await DbAuthToken.updateTokens(token.session_id, {
      access_token: validated.access_token,
      refresh_token: validated.refresh_token,
      expires_at: expiresAt,
    });

    return {
      ...token,
      access_token: validated.access_token,
      refresh_token: validated.refresh_token,
      expires_at: expiresAt,
    };
  },

  async deleteToken(sessionId: string) {
    const token = await DbAuthToken.getBySessionId(sessionId);
    await DbAuthToken.deleteBySessionId(sessionId);
    if (token && this.onLogout) {
      await this.onLogout({ userId: token.user_id, sessionId: token.session_id });
    }
  },
};
