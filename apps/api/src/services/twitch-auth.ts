import { type } from "arktype";
import { AuthSchemas } from "../schemas/auth";

const TWITCH_AUTH_URL = "https://id.twitch.tv/oauth2";
const TWITCH_USERS_URL = "https://api.twitch.tv/helix/users";
const TWITCH_SCOPES = ["user:read:email", "user:read:follows"];
const twitchUsersResponse = type({ data: AuthSchemas.twitchUser.array() });

interface TwitchAuthRequest {
  method: "GET" | "POST";
  url: string;
  headers?: Record<string, string>;
  body?: URLSearchParams;
}

export interface TwitchAuthDependencies {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  request: (request: TwitchAuthRequest) => Promise<unknown>;
}

export function createTwitchAuthClient(dependencies: TwitchAuthDependencies) {
  const tokenRequest = (parameters: Record<string, string>) =>
    dependencies.request({
      method: "POST",
      url: `${TWITCH_AUTH_URL}/token`,
      body: new URLSearchParams({
        client_id: dependencies.clientId,
        client_secret: dependencies.clientSecret,
        ...parameters,
      }),
    });

  return {
    getAuthorizationUrl(state: string) {
      const params = new URLSearchParams({
        client_id: dependencies.clientId,
        redirect_uri: dependencies.redirectUri,
        response_type: "code",
        scope: TWITCH_SCOPES.join(" "),
        state,
      });

      return `${TWITCH_AUTH_URL}/authorize?${params}`;
    },

    async exchangeCode(code: string) {
      const data = await tokenRequest({
        code,
        grant_type: "authorization_code",
        redirect_uri: dependencies.redirectUri,
      });

      return AuthSchemas.tokenResponse.assert(data);
    },

    async getUser(accessToken: string) {
      const data = await dependencies.request({
        method: "GET",
        url: TWITCH_USERS_URL,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Client-Id": dependencies.clientId,
        },
      });

      const user = twitchUsersResponse.assert(data).data[0];
      if (!user) throw new Error("Twitch returned no authenticated user");
      return user;
    },

    async refreshAccessToken(refreshToken: string) {
      const data = await tokenRequest({
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      });

      return AuthSchemas.tokenResponse.assert(data);
    },
  };
}
