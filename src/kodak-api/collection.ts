import type { Request, Response } from "express";
import { getDb } from "../db/database.js";
import { buildXml } from "./xml.js";

export function handleCollection(req: Request, res: Response): void {
  const device = (req as any).device;
  const db = getDb();

  const photos = db.prepare(
    `SELECT p.id, p.filename, p.dateTaken, p.importedAt, ap.sortOrder, a.sortOrder AS albumSortOrder
     FROM photos p
     JOIN album_photos ap ON ap.photoId = p.id
     JOIN albums a ON a.id = ap.albumId
     JOIN device_albums da ON da.albumId = ap.albumId
     WHERE da.deviceId = ?
     ORDER BY a.sortOrder ASC, ap.sortOrder ASC`
  ).all(device.id) as any[];

  const now = new Date().toISOString();
  const nowMs = String(Date.now());

  const contents = photos.length > 0
    ? {
        pictureSpec: photos.map((p: any) => ({
          id: p.id,
          modificationDate: p.importedAt ?? now,
          modificationTime: nowMs,
        })),
      }
    : {};

  const xml = buildXml("collection", {
    story: {
      id: device.id + "-collection",
      title: "Photos",
      displayDate: now,
      modificationDate: now,
      modificationTime: nowMs,
      authorProfileID: device.id,
      source: "EMAIL",
      contents,
    },
  });

  res.status(200).type("application/xml").send(xml);
}
