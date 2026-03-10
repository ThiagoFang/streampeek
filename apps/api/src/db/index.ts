import { Kysely, PostgresDialect } from "kysely";
import PG from "pg";
import type { DB } from "./generated/types";
import { envVariables } from "../lib/env";

const dialect = new PostgresDialect({
  pool: new PG.Pool({
    connectionString: envVariables.DATABASE_URL,
    max: 10,
  }),
});

export const db = new Kysely<DB>({
  dialect,
});
