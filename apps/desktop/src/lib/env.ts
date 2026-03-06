import { type } from "arktype"

const envSchema = type({
  VITE_TWITCH_CLIENT_ID: "string > 0",
})

const result = envSchema({
  VITE_TWITCH_CLIENT_ID: import.meta.env.VITE_TWITCH_CLIENT_ID,
})

if (result instanceof type.errors) {
  console.error("Invalid environment variables:", result.summary)
}

export const envVariables = result
