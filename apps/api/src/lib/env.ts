import { type } from "arktype";

const envSchema = type({
  PORT: "string.numeric.parse",
  TWITCH_CLIENT_ID: "string > 0",
  TWITCH_CLIENT_SECRET: "string > 0",
});

export const envVariables = envSchema.assert({
  PORT: Bun.env.PORT ?? "3000",
  TWITCH_CLIENT_ID: Bun.env.TWITCH_CLIENT_ID,
  TWITCH_CLIENT_SECRET: Bun.env.TWITCH_CLIENT_SECRET,
});
