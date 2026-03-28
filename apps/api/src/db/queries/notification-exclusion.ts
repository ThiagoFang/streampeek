import { db } from "..";

export const DbNotificationExclusion = {
  async listByUserId(userId: string) {
    return db
      .selectFrom("notification_exclusions as ne")
      .where("ne.user_id", "=", userId)
      .selectAll("ne")
      .execute();
  },

  async add(
    userId: string,
    data: { broadcaster_id: string; broadcaster_login: string; broadcaster_name: string },
  ) {
    await db
      .insertInto("notification_exclusions")
      .values({ user_id: userId, ...data })
      .onConflict((oc) => oc.columns(["user_id", "broadcaster_id"]).doNothing())
      .execute();
  },

  async remove(userId: string, broadcasterId: string) {
    await db
      .deleteFrom("notification_exclusions as ne")
      .where("ne.user_id", "=", userId)
      .where("ne.broadcaster_id", "=", broadcasterId)
      .execute();
  },

  async isExcluded(userId: string, broadcasterId: string) {
    const row = await db
      .selectFrom("notification_exclusions as ne")
      .where("ne.user_id", "=", userId)
      .where("ne.broadcaster_id", "=", broadcasterId)
      .select(db.fn<number>("1").as("exists"))
      .executeTakeFirst();

    return !!row;
  },
};
