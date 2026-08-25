import axios from "redaxios";
import { AuthSchemas } from "../schemas/auth";
import { envVariables } from "../lib/env";

const TWITCH_SCOPES = ["user:read:email", "user:read:follows"];

export const TwitchAuth = {
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

  async refreshAccessToken(refreshToken: string) {
    const { data } = await axios({
      method: "POST",
      url: "https://id.twitch.tv/oauth2/token",
      data: new URLSearchParams({
        client_id: envVariables.TWITCH_CLIENT_ID,
        client_secret: envVariables.TWITCH_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    return AuthSchemas.tokenResponse.assert(data);
  },
};
