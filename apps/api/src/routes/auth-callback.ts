import { Context } from "hono";
import { TwitchAuth } from "../services/twitch-auth";
import { AuthSchemas } from "../schemas/auth";
import { DbAuthToken } from "../db/queries/auth-token";
import { scheduleUserPoll } from "../services/poll-worker";
import { createLogger } from "../lib/logger";

const log = createLogger({ component: "auth-callback" });

export async function handleAuthCallback(c: Context) {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const validated = AuthSchemas.callbackQuery.assert({ code, state });

  if (!(await TwitchAuth.validateState(validated.state))) {
    return c.html("<html><body><h1>Erro</h1><p>Estado inválido.</p></body></html>");
  }

  try {
    const tokenData = await TwitchAuth.exchangeCode(validated.code);
    const userData = await TwitchAuth.getUser(tokenData.access_token);
    await TwitchAuth.saveToken(validated.state, tokenData, userData);

    const token = await DbAuthToken.getByUserId(userData.id);
    if (token) {
      await scheduleUserPoll(token.session_id);
    }

    return c.html("<html><body><h1>Login concluído!</h1><p>Pode fechar esta aba.</p></body></html>");
  } catch (err) {
    log.error({ err }, "Auth callback failed");
    return c.html("<html><body><h1>Erro</h1><p>Falha ao conectar com Twitch. Tente novamente.</p></body></html>", 502);
  }
}