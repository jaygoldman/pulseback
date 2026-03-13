import type { Request, Response, NextFunction } from "express";
import { getDb } from "../db/database.js";
import { logger } from "../logger.js";

export function requireDeviceToken(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers["devicetoken"] as string | undefined;

  if (!token) {
    logger.warn("Missing DeviceToken header", { path: req.path });
    res.status(424).send("");
    return;
  }

  const db = getDb();
  const device = db
    .prepare("SELECT id, deviceID FROM devices WHERE id = ?")
    .get(token);

  if (!device) {
    logger.warn("Unknown DeviceToken", { token, path: req.path });
    res.status(424).send("");
    return;
  }

  db.prepare("UPDATE devices SET lastSeen = ? WHERE id = ?").run(
    new Date().toISOString(),
    token
  );

  (req as any).device = device;
  next();
}
