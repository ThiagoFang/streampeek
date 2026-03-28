import type { RouterClient, InferRouterInputs, InferRouterOutputs } from "@orpc/server";
import { authRouter } from "./auth";
import { notificationExclusionRouter } from "./notification-exclusion";
import { settingsRouter } from "./settings";
import { streamerRouter } from "./streamer";

export const router = {
  auth: authRouter,
  notificationExclusion: notificationExclusionRouter,
  settings: settingsRouter,
  streamer: streamerRouter,
};

export type Router = RouterClient<typeof router>;
export type RouterInputs = InferRouterInputs<typeof router>;
export type RouterOutputs = InferRouterOutputs<typeof router>;
