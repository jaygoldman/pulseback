import type { Request, Response } from "express";
import { getDb } from "../db/database.js";
import { buildXml, parseXml } from "./xml.js";
import { logger } from "../logger.js";
import type { Config } from "../config.js";

export function createAuthorizeHandler(config: Config) {
  return async function handleAuthorize(req: Request, res: Response): Promise<void> {
    try {
      const body = await parseXml<any>(req.body);
      const info = body.authorizationInfo;
      const deviceID = info?.deviceID ?? "unknown";
      const activationID = info?.deviceActivationID;

      const db = getDb();
      const device = db.prepare("SELECT id, deviceID FROM devices WHERE deviceID = ? AND id = ?").get(deviceID, activationID) as { id: string; deviceID: string } | undefined;

      if (!device) {
        logger.warn("Authorization failed — unknown device", { deviceID, activationID });
        res.status(400).send("");
        return;
      }

      const storage = info?.deviceStorage;
      if (storage) {
        db.prepare("UPDATE devices SET storageInfo = ?, lastSeen = ? WHERE id = ?").run(JSON.stringify(storage), new Date().toISOString(), device.id);
      }

      const now = Date.now();
      const xml = buildXml("authorizationResponseInfo", {
        authorizationToken: device.id,
        apiBaseURL: "http://device.pulse.kodak.com/DeviceRestV10",
        status: {
          overallStatus: String(now),
          collectionStatus: String(now),
          settingsStatus: String(now),
          pollingPeriod: String(config.pollingPeriod),
        },
        deviceProfileList: {
          admins: {
            profile: {
              id: device.id,
              name: "Admin",
              emailAddress: "admin@kodak-pulse.local",
            },
          },
        },
      });

      logger.info("Device authorized", { deviceID });
      res.status(200).type("application/xml").send(xml);
    } catch (err) {
      logger.error("Authorization failed", { error: String(err) });
      res.status(400).send("");
    }
  };
}
