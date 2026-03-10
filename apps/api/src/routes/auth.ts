import { Hono } from "hono";
import { TwitchAuth } from "../services/twitch-auth";
import { AuthSchemas } from "../schemas/auth";

export const auth = new Hono()
  .get("/auth/twitch", (c) => {
    return c.json({ url: TwitchAuth.getAuthorizationUrl() });
  })
  .get("/auth/twitch/callback", async (c) => {
    const code = c.req.query("code");
    const validated = AuthSchemas.callbackQuery.assert({ code });
    const tokenData = await TwitchAuth.exchangeCode(validated.code);
    const userData = await TwitchAuth.getUser(tokenData.access_token);
    await TwitchAuth.saveToken(tokenData, userData);

    return c.html(
      "<html><body><h1>Login concluído!</h1><p>Pode fechar esta aba.</p></body></html>",
    );
  })
  .get("/auth/status", async (c) => {
    const token = await TwitchAuth.getStoredToken();
    return c.json({ authenticated: !!token });
  })
  .get("/auth/me", async (c) => {
    const token = await TwitchAuth.getStoredToken();
    if (!token) return c.json({ error: "UNAUTHORIZED" }, 401);

    return c.json({
      user_id: token.user_id,
      user_login: token.user_login,
      user_display_name: token.user_display_name,
    });
  })
  .post("/auth/logout", async (c) => {
    await TwitchAuth.deleteToken();
    return c.body(null, 204);
  });
