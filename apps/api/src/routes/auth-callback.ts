import { Context } from "hono";
import { createLogger } from "../lib/logger";
import { AuthSchemas } from "../schemas/auth";
import { AuthCallback } from "../services/auth-callback-runtime";

const log = createLogger({ component: "auth-callback" });

export async function handleAuthCallback(c: Context) {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const validated = AuthSchemas.callbackQuery.assert({ code, state });

  try {
    const result = await AuthCallback.complete(validated.code, validated.state);
    if (!result.completed) {
      return c.html("<html><body><h1>Erro</h1><p>Estado inválido.</p></body></html>", 400);
    }

    return c.html(
      "<html><body><h1>Login concluído!</h1><p>Pode fechar esta aba.</p></body></html>",
    );
  } catch (err) {
    log.error({ err }, "Auth callback failed");
    return c.html(
      "<html><body><h1>Erro</h1><p>Falha ao conectar com Twitch. Tente novamente.</p></body></html>",
      502,
    );
  }
}
