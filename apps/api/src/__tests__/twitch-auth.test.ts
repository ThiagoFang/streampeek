import { describe, expect, it } from "bun:test";
import { createTwitchAuthClient, type TwitchAuthDependencies } from "../services/twitch-auth";

const TOKEN = {
  access_token: "access-token",
  refresh_token: "refresh-token",
  expires_in: 3600,
  token_type: "bearer",
};

const USER = {
  id: "user-1",
  login: "streamer",
  display_name: "Streamer",
  profile_image_url: "https://example.com/profile.png",
};

function createHarness(responses: unknown[] = []) {
  const requests: Parameters<TwitchAuthDependencies["request"]>[0][] = [];
  const client = createTwitchAuthClient({
    clientId: "client-id",
    clientSecret: "client-secret",
    redirectUri: "https://api.example.com/auth/callback",
    request: async (request) => {
      requests.push(request);
      return responses.shift();
    },
  });

  return { client, requests };
}

describe("Twitch authentication client", () => {
  it("builds an authorization URL with the required OAuth values", () => {
    const { client } = createHarness();

    const url = new URL(client.getAuthorizationUrl("state-1"));

    expect(`${url.origin}${url.pathname}`).toBe("https://id.twitch.tv/oauth2/authorize");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: "client-id",
      redirect_uri: "https://api.example.com/auth/callback",
      response_type: "code",
      scope: "user:read:follows",
      state: "state-1",
    });
  });

  it("exchanges an authorization code for validated credentials", async () => {
    const { client, requests } = createHarness([TOKEN]);

    expect(await client.exchangeCode("authorization-code")).toEqual(TOKEN);
    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe("POST");
    expect(requests[0].url).toBe("https://id.twitch.tv/oauth2/token");
    expect(Object.fromEntries(requests[0].body ?? [])).toEqual({
      client_id: "client-id",
      client_secret: "client-secret",
      code: "authorization-code",
      grant_type: "authorization_code",
      redirect_uri: "https://api.example.com/auth/callback",
    });
  });

  it("loads the authenticated user with the correct headers", async () => {
    const { client, requests } = createHarness([{ data: [USER] }]);

    expect(await client.getUser("access-token")).toEqual(USER);
    expect(requests).toEqual([
      {
        method: "GET",
        url: "https://api.twitch.tv/helix/users",
        headers: {
          Authorization: "Bearer access-token",
          "Client-Id": "client-id",
        },
      },
    ]);
  });

  it("refreshes credentials without sending the redirect URI", async () => {
    const { client, requests } = createHarness([TOKEN]);

    expect(await client.refreshAccessToken("old-refresh-token")).toEqual(TOKEN);
    expect(Object.fromEntries(requests[0].body ?? [])).toEqual({
      client_id: "client-id",
      client_secret: "client-secret",
      refresh_token: "old-refresh-token",
      grant_type: "refresh_token",
    });
  });

  it("rejects malformed responses before they enter the application", async () => {
    const { client } = createHarness([{ access_token: "incomplete" }]);

    expect(client.exchangeCode("authorization-code")).rejects.toThrow();
  });

  it("rejects a response that contains no authenticated user", async () => {
    const { client } = createHarness([{ data: [] }]);

    expect(client.getUser("access-token")).rejects.toThrow();
  });
});
