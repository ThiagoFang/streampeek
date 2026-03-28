import { protectedProcedure } from "./procedures";
import { DbNotificationExclusion } from "../db/queries/notification-exclusion";
import { NotificationExclusionSchemas } from "../schemas/notification-exclusion";

export const notificationExclusionRouter = {
  list: protectedProcedure.handler(({ context }) =>
    DbNotificationExclusion.listByUserId(context.token.user_id),
  ),

  add: protectedProcedure
    .input(NotificationExclusionSchemas.add)
    .handler(({ context, input }) =>
      DbNotificationExclusion.add(context.token.user_id, input),
    ),

  remove: protectedProcedure
    .input(NotificationExclusionSchemas.remove)
    .handler(({ context, input }) =>
      DbNotificationExclusion.remove(context.token.user_id, input.broadcaster_id),
    ),
};
