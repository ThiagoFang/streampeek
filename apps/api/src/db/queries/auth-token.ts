import type { Insertable, Selectable } from "kysely";
import { db } from "..";
import type { AuthToken } from "../generated/types";

export const DbAuthToken = {
  async getFirst(): Promise<Selectable<AuthToken> | undefined> {
    return db.selectFrom("auth_tokens").selectAll().limit(1).executeTakeFirst();
  },

  async deleteAll(): Promise<void> {
    await db.deleteFrom("auth_tokens").execute();
  },

  async insert(data: Insertable<AuthToken>): Promise<void> {
    await db.insertInto("auth_tokens").values(data).execute();
  },
};
