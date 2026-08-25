import { DbAuthToken } from "../db/queries/auth-token";
import { createSessionRefresher } from "./session-refresh";
import { TwitchAuth } from "./twitch-auth-runtime";

export const SessionRefresher = createSessionRefresher({
  requestCredentials: TwitchAuth.refreshAccessToken,
  updateCredentials: DbAuthToken.updateTokens,
  now: () => Date.now(),
});
