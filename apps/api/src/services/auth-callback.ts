import type { AuthSchemas } from "../schemas/auth";

type TokenData = typeof AuthSchemas.tokenResponse.infer;
type TwitchUser = typeof AuthSchemas.twitchUser.infer;

export interface AuthCallbackDependencies {
  acceptAuthorization: (state: string) => Promise<boolean>;
  exchangeCode: (code: string) => Promise<TokenData>;
  getUser: (accessToken: string) => Promise<TwitchUser>;
  createSession: (token: TokenData, user: TwitchUser) => Promise<string>;
  deleteSession: (sessionId: string) => Promise<unknown>;
  schedulePolling: (userId: string) => Promise<unknown>;
  publishSession: (state: string, sessionId: string) => Promise<boolean>;
}

export function createAuthCallbackService(dependencies: AuthCallbackDependencies) {
  return {
    async complete(code: string, state: string) {
      if (!(await dependencies.acceptAuthorization(state))) {
        return { completed: false as const };
      }

      let sessionId: string | undefined;

      try {
        const token = await dependencies.exchangeCode(code);
        const user = await dependencies.getUser(token.access_token);
        sessionId = await dependencies.createSession(token, user);

        await dependencies.schedulePolling(user.id);
        const published = await dependencies.publishSession(state, sessionId);
        if (!published) {
          const canceledSessionId = sessionId;
          sessionId = undefined;
          await dependencies.deleteSession(canceledSessionId);
          return { completed: false as const };
        }

        return { completed: true as const };
      } catch (error) {
        if (!sessionId) throw error;

        try {
          await dependencies.deleteSession(sessionId);
        } catch (rollbackError) {
          throw new AggregateError(
            [error, rollbackError],
            "Authentication callback and session rollback failed",
          );
        }

        throw error;
      }
    },
  };
}
