import type { Request, Response } from "express";
import { getDb } from "../db/database.js";
import { buildXml } from "./xml.js";

export function handleSettings(req: Request, res: Response): void {
  const device = (req as any).device;
  const db = getDb();

  const settings = db.prepare("SELECT * FROM settings WHERE deviceId = ?").get(device.id) as any;
  const deviceRow = db.prepare("SELECT name FROM devices WHERE id = ?").get(device.id) as any;

  const xml = buildXml("deviceSettings", {
    name: deviceRow?.name ?? "Kodak Pulse",
    slideShowProperties: {
      duration: String(settings?.slideshowDuration ?? 10),
      transition: settings?.transitionType ?? "FADE",
    },
    displayProperties: {
      displayMode: settings?.displayMode ?? "ONEUP",
      showPictureInfo: "false",
      renderMode: "FILL",
    },
    autoPowerProperties: {
      autoPowerEnabled: "false",
      wakeOnContent: "false",
    },
    defaultCollectionOrder: "NAME",
    respondToLocalControls: "true",
    language: settings?.language ?? "en-us",
    timeZoneOffset: settings?.timezone ?? "0:00:00+0:00",
    managePictureStorage: "false",
    logLevel: "OFF",
    enableNotification: "true",
    modificationDate: new Date().toISOString(),
    modificationTime: String(Date.now()),
  });

  res.status(200).type("application/xml").send(xml);
}
