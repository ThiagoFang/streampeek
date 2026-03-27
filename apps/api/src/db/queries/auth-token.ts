import type { Selectable } from "kysely";
import { db } from "..";
import type { AuthToken } from "../generated/types";

export const DbAuthToken = {
  async getFirst() {
    return db.selectFrom("auth_tokens as at").selectAll("at").executeTakeFirst();
  },

  async getBySessionId(sessionId: string) {
    return db
      .selectFrom("auth_tokens as at")
      .where("at.session_id", "=", sessionId)
      .selectAll("at")
      .executeTakeFirst();
  },

  async upsertByUserId(data: Omit<Selectable<AuthToken>, "id" | "created_at">) {
    await db
      .insertInto("auth_tokens")
      .values(data)
      .onConflict((oc) =>
        oc.column("user_id").doUpdateSet({
          session_id: data.session_id,
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          user_login: data.user_login,
          user_display_name: data.user_display_name,
          expires_at: data.expires_at,
        }),
      )
      .execute();
  },

  async updateTokens(
    sessionId: string,
    data: {
      access_token: string;
      refresh_token: string;
      expires_at: Date;
    },
  ) {
    await db
      .updateTable("auth_tokens as at")
      .set(data)
      .where("at.session_id", "=", sessionId)
      .execute();
  },

  async deleteBySessionId(sessionId: string) {
    await db.deleteFrom("auth_tokens").where("session_id", "=", sessionId).execute();
  },
};
