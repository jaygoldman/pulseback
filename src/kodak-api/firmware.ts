import type { Request, Response } from "express";
import { logger } from "../logger.js";

export function handleFirmwareCheck(req: Request, res: Response): void {
  logger.info("Firmware update check blocked", { url: req.url });
  res.status(404).send("");
}
