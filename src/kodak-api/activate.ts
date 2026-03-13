import type { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db/database.js";
import { buildXml, parseXml } from "./xml.js";
import { logger } from "../logger.js";

const DEFAULT_ALBUM_NAME = "All Photos";

function ensureDefaultAlbum(): string {
  const db = getDb();
  let album = db.prepare("SELECT id FROM albums WHERE name = ?").get(DEFAULT_ALBUM_NAME) as { id: string } | undefined;
  if (!album) {
    const id = uuidv4();
    db.prepare("INSERT INTO albums (id, name, sortOrder, createdAt) VALUES (?, ?, 0, ?)").run(id, DEFAULT_ALBUM_NAME, new Date().toISOString());
    album = { id };
    // Assign to all existing devices
    const devices = db.prepare("SELECT id FROM devices").all() as { id: string }[];
    const insert = db.prepare("INSERT OR IGNORE INTO device_albums (deviceId, albumId) VALUES (?, ?)");
    for (const device of devices) {
      insert.run(device.id, id);
    }
  }
  return album.id;
}

export async function handleActivate(req: Request, res: Response): Promise<void> {
  try {
    const body = await parseXml<any>(req.body);
    const info = body.activationInfo;
    const deviceID = info?.deviceID ?? "unknown";

    logger.info("Device activation request", { deviceID });

    const db = getDb();
    let existing = db.prepare("SELECT id FROM devices WHERE deviceID = ?").get(deviceID) as { id: string } | undefined;

    const id = existing?.id ?? uuidv4();

    if (!existing) {
      db.prepare("INSERT INTO devices (id, deviceID, name, activationDate) VALUES (?, ?, ?, ?)").run(id, deviceID, "Kodak Pulse", new Date().toISOString());
      db.prepare("INSERT INTO settings (deviceId) VALUES (?)").run(id);
      const defaultAlbumId = ensureDefaultAlbum();
      db.prepare("INSERT OR IGNORE INTO device_albums (deviceId, albumId) VALUES (?, ?)").run(id, defaultAlbumId);
      logger.info("New device registered", { deviceID, id });
    }

    const xml = buildXml("activationResponseInfo", {
      deviceActivationID: id,
      deviceAuthorizationURL: "https://device.pulse.kodak.com/DeviceRestV10/Authorize",
      deviceProfileList: {
        admins: {
          profile: {
            id: uuidv4(),
            name: "Admin",
            emailAddress: "admin@kodak-pulse.local",
          },
        },
      },
    });

    res.status(412).type("application/xml").send(xml);
  } catch (err) {
    logger.error("Activation failed", { error: String(err) });
    res.status(400).type("application/xml").send(buildXml("error", { message: "Bad request" }));
  }
}
