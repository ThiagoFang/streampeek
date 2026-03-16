import axios from "redaxios";
import { envVariables } from "./env";
import { useSessionStore } from "@/store/session";

const instance = axios.create({
  baseURL: envVariables.VITE_API_BASE_URL,
});

export const api: typeof instance = ((config: Parameters<typeof instance>[0]) => {
  const sessionId = useSessionStore.getState().sessionId;

  return instance({
    ...(typeof config === "string" ? { url: config } : config),
    headers: {
      ...(typeof config === "object" ? config?.headers : {}),
      ...(sessionId ? { Authorization: `Session ${sessionId}` } : {}),
    },
  });
}) as typeof instance;
