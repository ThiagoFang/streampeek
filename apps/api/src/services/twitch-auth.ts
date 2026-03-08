import axios from "redaxios";
import { db } from "../db/index";
import { AuthSchemas } from "../schemas/auth";
import { envVariables } from "../lib/env";

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

  saveToken(
    tokenData: typeof AuthSchemas.tokenResponse.infer,
    userData: typeof AuthSchemas.twitchUser.infer,
  ) {
    db.run("DELETE FROM auth_tokens");
    db.run(
      "INSERT INTO auth_tokens (access_token, refresh_token, user_id, user_login, user_display_name) VALUES (?, ?, ?, ?, ?)",
      [
        tokenData.access_token,
        tokenData.refresh_token,
        userData.id,
        userData.login,
        userData.display_name,
      ],
    );
  },

  getStoredToken() {
    return db.query("SELECT * FROM auth_tokens LIMIT 1").get() as Record<string, string> | null;
  },

  deleteToken() {
    db.run("DELETE FROM auth_tokens");
  },
};
