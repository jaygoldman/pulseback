import type Database from "better-sqlite3";

export const version = 1;

export function up(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      deviceID TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL DEFAULT 'Kodak Pulse',
      activationDate TEXT NOT NULL,
      lastSeen TEXT,
      storageInfo TEXT
    );

    CREATE TABLE IF NOT EXISTS photos (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      originalPath TEXT NOT NULL,
      displayPath TEXT NOT NULL,
      width INTEGER,
      height INTEGER,
      dateTaken TEXT,
      importedAt TEXT NOT NULL,
      fileSize INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS albums (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sortOrder INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS album_photos (
      albumId TEXT NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
      photoId TEXT NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
      sortOrder INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (albumId, photoId)
    );

    CREATE TABLE IF NOT EXISTS device_albums (
      deviceId TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      albumId TEXT NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
      PRIMARY KEY (deviceId, albumId)
    );

    CREATE TABLE IF NOT EXISTS settings (
      deviceId TEXT PRIMARY KEY REFERENCES devices(id) ON DELETE CASCADE,
      slideshowDuration INTEGER NOT NULL DEFAULT 10,
      transitionType TEXT NOT NULL DEFAULT 'FADE',
      displayMode TEXT NOT NULL DEFAULT 'ONEUP',
      brightness INTEGER NOT NULL DEFAULT 100,
      timezone TEXT NOT NULL DEFAULT '0:00:00+0:00',
      language TEXT NOT NULL DEFAULT 'en-us'
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER NOT NULL
    );
  `);
}
