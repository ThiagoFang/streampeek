import { type } from "arktype"

const envSchema = type({
  PORT: "string.numeric.parse",
  TWITCH_CLIENT_ID: "string > 0",
  TWITCH_CLIENT_SECRET: "string > 0",
})

const result = envSchema({
  PORT: process.env.PORT ?? "3000",
  TWITCH_CLIENT_ID: process.env.TWITCH_CLIENT_ID,
  TWITCH_CLIENT_SECRET: process.env.TWITCH_CLIENT_SECRET,
})

if (result instanceof type.errors) {
  console.error("Invalid environment variables:", result.summary)
  process.exit(1)
}

export const envVariables = result
