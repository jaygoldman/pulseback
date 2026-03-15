import type { Request, Response } from "express";
import { getDb } from "../db/database.js";
import { buildXml } from "./xml.js";
import { getServerIp } from "../config.js";
import type { Config } from "../config.js";
import { notifyCollectionChange } from "./status.js";

export function createEntityHandler(config: Config) {
  return function handleEntity(req: Request, res: Response): void {
    const { entityID } = req.params;
    const db = getDb();

    if (req.method === "DELETE") {
      const device = (req as any).device;
      // Only delete from albums assigned to THIS device — never touch other devices' collections
      db.prepare(
        `DELETE FROM album_photos WHERE photoId = ? AND albumId IN
         (SELECT albumId FROM device_albums WHERE deviceId = ?)`
      ).run(entityID, device.id);
      notifyCollectionChange();
      res.status(200).send("");
      return;
    }

    const photo = db.prepare("SELECT * FROM photos WHERE id = ?").get(entityID) as any;

    if (!photo) {
      res.status(404).send("");
      return;
    }

    const serverIp = getServerIp();
    const fileURL = `http://${serverIp}:${config.ports.http}/photos/${photo.id}.jpg`;

    const xml = buildXml("picture", {
      id: photo.id,
      title: photo.filename,
      captureDate: photo.dateTaken ?? photo.importedAt,
      modificationDate: photo.importedAt,
      modificationTime: String(Date.now()),
      fileURL,
    });

    res.status(200).type("application/xml").send(xml);
  };
}
