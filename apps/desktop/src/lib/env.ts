interface EnvVariables {
  VITE_API_BASE_URL: string;
}

export function readEnvVariables(env: Record<string, unknown>): EnvVariables {
  const apiBaseUrl = env.VITE_API_BASE_URL;

  if (typeof apiBaseUrl !== "string" || !apiBaseUrl.trim()) {
    throw new Error("VITE_API_BASE_URL must be a non-empty string");
  }

  return { VITE_API_BASE_URL: apiBaseUrl };
}

export const envVariables = readEnvVariables(import.meta.env);
