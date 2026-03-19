import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createRouterUtils } from "@orpc/tanstack-query";
import type { Router } from "@streampeek/api/rpc/router";
import { envVariables } from "./env";
import { useSessionStore } from "@/store/session";

const link = new RPCLink({
  url: `${envVariables.VITE_API_BASE_URL}/rpc`,
  headers: () => {
    const sessionId = useSessionStore.getState().sessionId;
    return sessionId ? { Authorization: `Session ${sessionId}` } : {};
  },
});

export const client = createORPCClient<Router>(link);
export const orpc = createRouterUtils(client);
