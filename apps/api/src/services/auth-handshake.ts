const HANDSHAKE_TTL_SECONDS = 600;
const MAX_STATE_GENERATION_ATTEMPTS = 3;

export interface AuthHandshakeStore {
  reserveAuthorization: (state: string, ttlSeconds: number) => Promise<boolean>;
  consumeAuthorization: (state: string) => Promise<boolean>;
  publishSession: (state: string, sessionId: string, ttlSeconds: number) => Promise<boolean>;
  claimSession: (state: string) => Promise<string | null>;
  cancelAuthorization: (state: string, ttlSeconds: number) => Promise<string | null>;
}

interface AuthHandshakeOptions {
  generateState?: () => string;
  ttlSeconds?: number;
}

export function createAuthHandshake(
  store: AuthHandshakeStore,
  {
    generateState = () => crypto.randomUUID(),
    ttlSeconds = HANDSHAKE_TTL_SECONDS,
  }: AuthHandshakeOptions = {},
) {
  return {
    async begin() {
      for (let attempt = 0; attempt < MAX_STATE_GENERATION_ATTEMPTS; attempt += 1) {
        const state = generateState();
        if (await store.reserveAuthorization(state, ttlSeconds)) return state;
      }

      throw new Error("Could not reserve a unique authentication state");
    },

    acceptCallback(state: string) {
      return store.consumeAuthorization(state);
    },

    publishSession(state: string, sessionId: string) {
      return store.publishSession(state, sessionId, ttlSeconds);
    },

    claimSession(state: string) {
      return store.claimSession(state);
    },

    cancel(state: string) {
      return store.cancelAuthorization(state, ttlSeconds);
    },
  };
}
