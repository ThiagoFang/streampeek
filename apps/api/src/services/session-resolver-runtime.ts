import { DbAuthToken } from "../db/queries/auth-token";
import { createSessionResolver } from "./session-resolver";
import { SessionRefresher } from "./session-refresh-runtime";

export const SessionResolver = createSessionResolver({
  getBySessionId: DbAuthToken.getBySessionId,
  getByUserId: DbAuthToken.getByUserId,
  refreshToken: (token) => SessionRefresher.refresh(token),
});
