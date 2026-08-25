import { scheduleUserPoll } from "./polling";
import { TwitchAuth } from "./twitch-auth-runtime";
import { AuthHandshake } from "./auth-handshake-runtime";
import { createAuthCallbackService } from "./auth-callback";
import { AuthSession } from "./auth-session-runtime";

export const AuthCallback = createAuthCallbackService({
  acceptAuthorization: AuthHandshake.acceptCallback,
  exchangeCode: TwitchAuth.exchangeCode,
  getUser: TwitchAuth.getUser,
  createSession: AuthSession.create,
  deleteSession: AuthSession.delete,
  schedulePolling: scheduleUserPoll,
  publishSession: AuthHandshake.publishSession,
});
