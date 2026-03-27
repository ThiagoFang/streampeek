import { db } from "..";

export const DbUserSettings = {
  async getByUserId(userId: string) {
    const row = await db
      .selectFrom("user_settings as us")
      .where("us.user_id", "=", userId)
      .select("us.notifications_enabled")
      .executeTakeFirst();

    return row ?? { notifications_enabled: true };
  },

  async upsert(userId: string, data: { notifications_enabled: boolean }) {
    await db
      .insertInto("user_settings")
      .values({ user_id: userId, notifications_enabled: data.notifications_enabled })
      .onConflict((oc) =>
        oc.column("user_id").doUpdateSet({ notifications_enabled: data.notifications_enabled }),
      )
      .execute();
  },
};
