import type { RouterClient, InferRouterInputs, InferRouterOutputs } from "@orpc/server";
import { authRouter } from "./auth";
import { streamerRouter } from "./streamer";

export const router = {
  auth: authRouter,
  streamer: streamerRouter,
};

export type Router = RouterClient<typeof router>;
export type RouterInputs = InferRouterInputs<typeof router>;
export type RouterOutputs = InferRouterOutputs<typeof router>;
