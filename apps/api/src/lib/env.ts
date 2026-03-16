import { type } from "arktype";

const envSchema = type({
  PORT: "string.numeric.parse",
  TWITCH_CLIENT_ID: "string > 0",
  TWITCH_CLIENT_SECRET: "string > 0",
  TWITCH_REDIRECT_URI: "string > 0",
  DATABASE_URL: "string > 0",
  CORS_ORIGIN: "string > 0",
});

export const envVariables = envSchema.assert({
  PORT: Bun.env.PORT ?? "3000",
  TWITCH_CLIENT_ID: Bun.env.TWITCH_CLIENT_ID,
  TWITCH_CLIENT_SECRET: Bun.env.TWITCH_CLIENT_SECRET,
  TWITCH_REDIRECT_URI:
    Bun.env.TWITCH_REDIRECT_URI ??
    "http://localhost:3000/auth/twitch/callback",
  DATABASE_URL: Bun.env.DATABASE_URL,
  CORS_ORIGIN: Bun.env.CORS_ORIGIN ?? "http://localhost:1420",
});
