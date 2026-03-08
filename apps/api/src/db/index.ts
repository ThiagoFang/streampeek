import { Database } from "bun:sqlite"
import { join } from "path"

export const db = new Database(join(import.meta.dir, "../../streampeek.db"))

db.exec("PRAGMA journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS auth_tokens (
    id INTEGER PRIMARY KEY,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_login TEXT NOT NULL,
    user_display_name TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);
