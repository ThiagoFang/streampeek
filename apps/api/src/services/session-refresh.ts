export interface RefreshableSession {
  session_id: string;
  refresh_token: string;
}

export interface RefreshedCredentials {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface StoredCredentials {
  access_token: string;
  refresh_token: string;
  expires_at: Date;
}

export interface SessionRefreshDependencies {
  requestCredentials: (refreshToken: string) => Promise<RefreshedCredentials>;
  updateCredentials: (sessionId: string, credentials: StoredCredentials) => Promise<void>;
  now: () => number;
}

export function createSessionRefresher(dependencies: SessionRefreshDependencies) {
  return {
    async refresh(session: RefreshableSession) {
      const refreshed = await dependencies.requestCredentials(session.refresh_token);

      await dependencies.updateCredentials(session.session_id, {
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        expires_at: new Date(dependencies.now() + refreshed.expires_in * 1000),
      });
    },
  };
}
