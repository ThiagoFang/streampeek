import type { Selectable } from "kysely";
import type { AuthToken } from "../db/generated/types";

type StoredAuthToken = Selectable<AuthToken>;

interface SessionResolverDependencies {
  getBySessionId: (sessionId: string) => Promise<StoredAuthToken | undefined>;
  getByUserId: (userId: string) => Promise<StoredAuthToken | undefined>;
  refreshToken: (token: StoredAuthToken) => Promise<unknown>;
  now?: () => Date;
}

export function createSessionResolver({
  getBySessionId,
  getByUserId,
  refreshToken,
  now = () => new Date(),
}: SessionResolverDependencies) {
  const activeRefreshes = new Map<string, Promise<StoredAuthToken | null>>();

  const isExpired = (token: StoredAuthToken) =>
    new Date(token.expires_at).getTime() <= now().getTime();

  const refresh = (token: StoredAuthToken) => {
    const activeRefresh = activeRefreshes.get(token.session_id);
    if (activeRefresh) return activeRefresh;

    const refreshPromise = (async () => {
      try {
        await refreshToken(token);
      } catch {
        const currentToken = await getBySessionId(token.session_id);
        return currentToken && !isExpired(currentToken) ? currentToken : null;
      }

      const currentToken = await getBySessionId(token.session_id);
      return currentToken && !isExpired(currentToken) ? currentToken : null;
    })();

    activeRefreshes.set(token.session_id, refreshPromise);
    const clearRefresh = () => {
      if (activeRefreshes.get(token.session_id) === refreshPromise) {
        activeRefreshes.delete(token.session_id);
      }
    };
    void refreshPromise.then(clearRefresh, clearRefresh);

    return refreshPromise;
  };

  const resolve = async (token: StoredAuthToken | undefined) => {
    if (!token) return null;
    return isExpired(token) ? refresh(token) : token;
  };

  return {
    async bySessionId(sessionId: string) {
      return resolve(await getBySessionId(sessionId));
    },

    async byUserId(userId: string) {
      return resolve(await getByUserId(userId));
    },
  };
}
