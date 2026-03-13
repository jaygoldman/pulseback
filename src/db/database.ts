import BetterSqlite3 from "better-sqlite3";
import { join } from "node:path";
import { logger } from "../logger.js";

import * as migration001 from "./migrations/001-initial.js";

const migrations = [migration001];

let db: BetterSqlite3.Database | null = null;

export function initDatabase(dataDir: string): void {
  const dbPath = join(dataDir, "kodak-pulse.db");
  db = new BetterSqlite3(dbPath);

  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  runMigrations(db);
  logger.info("Database initialized", { path: dbPath });
}

function runMigrations(db: BetterSqlite3.Database): void {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)`);

  const row = db.prepare("SELECT version FROM schema_version").get() as
    | { version: number }
    | undefined;
  const currentVersion = row?.version ?? 0;

  for (const migration of migrations) {
    if (migration.version > currentVersion) {
      logger.info("Running migration", { version: migration.version });
      db.transaction(() => {
        migration.up(db!);
        if (currentVersion === 0) {
          db!.prepare("INSERT INTO schema_version (version) VALUES (?)").run(
            migration.version
          );
        } else {
          db!.prepare("UPDATE schema_version SET version = ?").run(
            migration.version
          );
        }
      })();
    }
  }
}

export function getDb(): BetterSqlite3.Database {
  if (!db) throw new Error("Database not initialized. Call initDatabase first.");
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
