import { describe, it, expect, afterEach } from "vitest";
import { initDatabase, getDb, closeDb } from "./database.js";
import { existsSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const TEST_DATA_DIR = join(process.cwd(), "data-test");

describe("database", () => {
  afterEach(() => {
    closeDb();
    if (existsSync(TEST_DATA_DIR)) {
      rmSync(TEST_DATA_DIR, { recursive: true });
    }
  });

  it("creates database and runs migrations", () => {
    mkdirSync(TEST_DATA_DIR, { recursive: true });
    initDatabase(TEST_DATA_DIR);
    const db = getDb();

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all()
      .map((r: any) => r.name);

    expect(tables).toContain("devices");
    expect(tables).toContain("photos");
    expect(tables).toContain("albums");
    expect(tables).toContain("album_photos");
    expect(tables).toContain("device_albums");
    expect(tables).toContain("settings");
    expect(tables).toContain("users");
    expect(tables).toContain("schema_version");
  });

  it("is idempotent — running migrations twice does not error", () => {
    mkdirSync(TEST_DATA_DIR, { recursive: true });
    initDatabase(TEST_DATA_DIR);
    closeDb();
    initDatabase(TEST_DATA_DIR);
    const db = getDb();
    const version = db.prepare("SELECT version FROM schema_version").get() as any;
    expect(version.version).toBe(1);
  });
});
