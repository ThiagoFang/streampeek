import type { RouterClient } from "@orpc/server";
import { authRouter } from "./auth";
import { streamerRouter } from "./streamer";

export const router = {
  auth: authRouter,
  streamer: streamerRouter,
};

export type Router = RouterClient<typeof router>;
