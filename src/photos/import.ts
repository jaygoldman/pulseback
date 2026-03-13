import { createRequire } from "node:module";
import { v4 as uuidv4 } from "uuid";
import { copyFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import sharp from "sharp";
import { getDb } from "../db/database.js";
import { resizeForDisplay } from "./resize.js";
import { logger } from "../logger.js";
import { notifyCollectionChange } from "../kodak-api/status.js";

const require = createRequire(import.meta.url);
const exifReader = require("exif-reader") as (buf: Buffer) => {
  Image?: { DateTime?: Date };
  Photo?: { DateTimeOriginal?: Date; DateTimeDigitized?: Date };
};

const DEFAULT_ALBUM_NAME = "All Photos";

export interface ImportResult {
  id: string;
  filename: string;
  success: boolean;
  error?: string;
}

export function ensureDefaultAlbum(): string {
  const db = getDb();
  let album = db
    .prepare("SELECT id FROM albums WHERE name = ?")
    .get(DEFAULT_ALBUM_NAME) as { id: string } | undefined;
  if (!album) {
    const id = uuidv4();
    db.prepare(
      "INSERT INTO albums (id, name, sortOrder, createdAt) VALUES (?, ?, 0, ?)"
    ).run(id, DEFAULT_ALBUM_NAME, new Date().toISOString());
    album = { id };
    const devices = db
      .prepare("SELECT id FROM devices")
      .all() as { id: string }[];
    const insert = db.prepare(
      "INSERT OR IGNORE INTO device_albums (deviceId, albumId) VALUES (?, ?)"
    );
    for (const device of devices) {
      insert.run(device.id, id);
    }
  }
  return album.id;
}

function extractDateTaken(metadata: sharp.Metadata): string | null {
  if (!metadata.exif) return null;
  try {
    const exif = exifReader(metadata.exif);
    const date =
      exif.Photo?.DateTimeOriginal ??
      exif.Photo?.DateTimeDigitized ??
      exif.Image?.DateTime;
    if (date instanceof Date && !isNaN(date.getTime())) {
      return date.toISOString();
    }
    return null;
  } catch {
    return null;
  }
}

export async function importPhoto(
  sourcePath: string,
  filename: string,
  dataDir: string
): Promise<ImportResult> {
  const id = uuidv4();
  const ext = extname(filename).toLowerCase() || ".jpg";
  const originalPath = join(dataDir, "photos", "originals", `${id}${ext}`);
  const displayPath = join(dataDir, "photos", "display", `${id}.jpg`);

  try {
    copyFileSync(sourcePath, originalPath);
    const stats = statSync(originalPath);

    await resizeForDisplay(originalPath, displayPath);

    const metadata = await sharp(originalPath).metadata();
    const dateTaken = extractDateTaken(metadata);

    const db = getDb();
    db.prepare(
      `INSERT INTO photos (id, filename, originalPath, displayPath, width, height, dateTaken, importedAt, fileSize)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      filename,
      originalPath,
      displayPath,
      metadata.width ?? 0,
      metadata.height ?? 0,
      dateTaken,
      new Date().toISOString(),
      stats.size
    );

    // Add to default album
    const defaultAlbumId = ensureDefaultAlbum();
    const maxSort = db
      .prepare(
        "SELECT MAX(sortOrder) as max FROM album_photos WHERE albumId = ?"
      )
      .get(defaultAlbumId) as { max: number | null } | undefined;
    const sortOrder = (maxSort?.max ?? -1) + 1;
    db.prepare(
      "INSERT OR IGNORE INTO album_photos (albumId, photoId, sortOrder) VALUES (?, ?, ?)"
    ).run(defaultAlbumId, id, sortOrder);

    notifyCollectionChange();
    logger.info("Photo imported", { id, filename, dateTaken });

    return { id, filename, success: true };
  } catch (err) {
    logger.warn("Photo import failed", { filename, error: String(err) });
    return { id, filename, success: false, error: String(err) };
  }
}
