import { type } from "arktype";

const envSchema = type({
  VITE_API_BASE_URL: "string >= 1",
});

export const envVariables = envSchema.assert({
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
});
