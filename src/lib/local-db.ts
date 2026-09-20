import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
export const localRoot = () =>
  path.resolve(
    /* turbopackIgnore: true */ process.env.LOCAL_DATA_DIR || ".local",
  );
const globalDb = globalThis as unknown as { studyDb?: DatabaseSync };
export function db() {
  if (!globalDb.studyDb) {
    mkdirSync(localRoot(), { recursive: true });
    const database = new DatabaseSync(path.join(localRoot(), "study.sqlite"));
    database.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, hash TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS records (entity TEXT NOT NULL, id TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, data TEXT NOT NULL, PRIMARY KEY(entity,id));
      CREATE INDEX IF NOT EXISTS records_owner ON records(user_id,entity);
      CREATE TABLE IF NOT EXISTS auth_limits (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, reset_at INTEGER NOT NULL);`);
    globalDb.studyDb = database;
  }
  return globalDb.studyDb;
}
