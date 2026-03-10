import axios from "redaxios";
import { AuthSchemas } from "../schemas/auth";
import { envVariables } from "../lib/env";
import { DbAuthToken } from "../db/queries/auth-token";

const REDIRECT_URI = "http://localhost:3000/auth/twitch/callback";

export const TwitchAuth = {
  getAuthorizationUrl() {
    const params = new URLSearchParams({
      client_id: envVariables.TWITCH_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: "code",
      scope: "user:read:email",
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
        redirect_uri: REDIRECT_URI,
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
    tokenData: typeof AuthSchemas.tokenResponse.infer,
    userData: typeof AuthSchemas.twitchUser.infer,
  ) {
    await DbAuthToken.deleteAll();
    await DbAuthToken.insert({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      user_id: userData.id,
      user_login: userData.login,
      user_display_name: userData.display_name,
    });
  },

  async getStoredToken() {
    return DbAuthToken.getFirst();
  },

  async deleteToken() {
    await DbAuthToken.deleteAll();
  },
};
