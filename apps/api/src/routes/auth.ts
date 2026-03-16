import { Hono } from "hono";
import { TwitchAuth } from "../services/twitch-auth";
import { AuthSchemas } from "../schemas/auth";
import { authMiddleware, type AuthEnv } from "../middleware/auth";

export const auth = new Hono<AuthEnv>()
  .get("/auth/twitch", (c) => {
    const state = TwitchAuth.generateState();
    const url = TwitchAuth.getAuthorizationUrl(state);
    return c.json({ url, state });
  })
  .get("/auth/twitch/callback", async (c) => {
    const code = c.req.query("code");
    const state = c.req.query("state");
    const validated = AuthSchemas.callbackQuery.assert({ code, state });

    if (!TwitchAuth.validateState(validated.state))
      return c.json({ error: "INVALID_STATE" }, 403);

    const tokenData = await TwitchAuth.exchangeCode(validated.code);
    const userData = await TwitchAuth.getUser(tokenData.access_token);
    await TwitchAuth.saveToken(validated.state, tokenData, userData);

    return c.html(
      "<html><body><h1>Login concluído!</h1><p>Pode fechar esta aba.</p></body></html>",
    );
  })
  .get("/auth/status", async (c) => {
    const state = c.req.query("state");
    if (!state) return c.json({ authenticated: false });

    const sessionId = TwitchAuth.claimSession(state);
    if (!sessionId) return c.json({ authenticated: false });

    return c.json({ authenticated: true, session_id: sessionId });
  })
  .get("/auth/me", authMiddleware, async (c) => {
    const token = c.get("token");
    return c.json({
      user_id: token.user_id,
      user_login: token.user_login,
      user_display_name: token.user_display_name,
    });
  })
  .post("/auth/logout", authMiddleware, async (c) => {
    const token = c.get("token");
    await TwitchAuth.deleteToken(token.session_id);
    return c.body(null, 204);
  });
