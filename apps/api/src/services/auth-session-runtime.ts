import { DbAuthToken } from "../db/queries/auth-token";
import { createAuthSessionService } from "./auth-session";
import { invalidateSessionResources } from "./session-lifecycle";

export const AuthSession = createAuthSessionService({
  findByUserId: DbAuthToken.getByUserId,
  findBySessionId: DbAuthToken.getBySessionId,
  saveByUserId: DbAuthToken.upsertByUserId,
  deleteBySessionId: DbAuthToken.deleteBySessionId,
  invalidateSession: invalidateSessionResources,
  createSessionId: () => crypto.randomUUID(),
  now: () => Date.now(),
});
