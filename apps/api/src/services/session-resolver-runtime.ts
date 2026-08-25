import { DbAuthToken } from "../db/queries/auth-token";
import { createSessionResolver } from "./session-resolver";
import { TwitchAuth } from "./twitch-auth";

export const SessionResolver = createSessionResolver({
  getBySessionId: DbAuthToken.getBySessionId,
  getByUserId: DbAuthToken.getByUserId,
  refreshToken: (token) => TwitchAuth.refreshToken(token),
});
