import { AuthSchemas } from "../schemas/auth";

type TokenData = typeof AuthSchemas.tokenResponse.infer;
type TwitchUser = typeof AuthSchemas.twitchUser.infer;

export interface SessionIdentity {
  user_id: string;
  session_id: string;
}

export interface StoredSession {
  session_id: string;
  access_token: string;
  refresh_token: string;
  user_id: string;
  user_login: string;
  user_display_name: string;
  profile_image_url: string;
  expires_at: Date;
}

export interface SessionInvalidationContext {
  userId: string;
  sessionId: string;
}

export interface AuthSessionDependencies {
  findByUserId: (userId: string) => Promise<SessionIdentity | undefined>;
  findBySessionId: (sessionId: string) => Promise<SessionIdentity | undefined>;
  saveByUserId: (session: StoredSession) => Promise<void>;
  deleteBySessionId: (sessionId: string) => Promise<void>;
  invalidateSession: (context: SessionInvalidationContext) => Promise<void>;
  createSessionId: () => string;
  now: () => number;
}

export function createAuthSessionService(dependencies: AuthSessionDependencies) {
  return {
    async create(tokenData: TokenData, user: TwitchUser) {
      const previousSession = await dependencies.findByUserId(user.id);
      const sessionId = dependencies.createSessionId();

      await dependencies.saveByUserId({
        session_id: sessionId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        user_id: user.id,
        user_login: user.login,
        user_display_name: user.display_name,
        profile_image_url: user.profile_image_url,
        expires_at: new Date(dependencies.now() + tokenData.expires_in * 1000),
      });

      if (previousSession) {
        await dependencies.invalidateSession({
          userId: previousSession.user_id,
          sessionId: previousSession.session_id,
        });
      }

      return sessionId;
    },

    async delete(sessionId: string) {
      const session = await dependencies.findBySessionId(sessionId);
      await dependencies.deleteBySessionId(sessionId);

      if (session) {
        await dependencies.invalidateSession({
          userId: session.user_id,
          sessionId: session.session_id,
        });
      }
    },
  };
}
