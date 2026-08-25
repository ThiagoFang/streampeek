import { type } from "arktype";
import { protectedProcedure } from "./procedures";
import { DbUserSettings } from "../db/queries/user-settings";

export const settingsRouter = {
  get: protectedProcedure.handler(({ context }) =>
    DbUserSettings.getByUserId(context.token.user_id),
  ),

  update: protectedProcedure
    .input(type({ notifications_enabled: "boolean" }))
    .handler(({ context, input }) => DbUserSettings.upsert(context.token.user_id, input)),
};
