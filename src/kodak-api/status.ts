import type { Request, Response } from "express";
import { buildXml } from "./xml.js";
import type { Config } from "../config.js";

let lastCollectionChange = Date.now();

export function notifyCollectionChange(): void {
  lastCollectionChange = Date.now();
}

export function createStatusHandler(config: Config) {
  return function handleStatus(req: Request, res: Response): void {
    const rawTimestamp = Array.isArray(req.params.timestamp) ? req.params.timestamp[0] : req.params.timestamp;
    const timestamp = parseInt(rawTimestamp, 10);
    const now = Date.now();

    const xml = buildXml("status", {
      overallStatus: String(now),
      collectionStatus: String(lastCollectionChange),
      settingsStatus: String(now),
      pollingPeriod: String(config.pollingPeriod),
    });

    if (lastCollectionChange > timestamp) {
      res.status(425).type("application/xml").send(xml);
    } else {
      res.status(200).type("application/xml").send(xml);
    }
  };
}
