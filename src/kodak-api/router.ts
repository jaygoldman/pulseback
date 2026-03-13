import { Router, raw } from "express";
import { handleActivate } from "./activate.js";
import { createAuthorizeHandler } from "./authorize.js";
import { createStatusHandler } from "./status.js";
import { handleSettings } from "./settings.js";
import { handleCollection } from "./collection.js";
import { createEntityHandler } from "./entity.js";
import { handleProfile } from "./profile.js";
import { handleFirmwareCheck } from "./firmware.js";
import { requireDeviceToken } from "./device-token.js";
import type { Config } from "../config.js";

export function createKodakRouter(config: Config): Router {
  const router = Router();

  // Parse raw bodies for XML
  router.use(raw({ type: "*/*", limit: "1mb" }));

  // Convert buffer to string
  router.use((req, _res, next) => {
    if (Buffer.isBuffer(req.body)) {
      req.body = req.body.toString("utf-8");
    }
    next();
  });

  // Step 1: Activation (no auth)
  router.post("/DeviceRest/activate", handleActivate);

  // Step 2: Authorization (no auth)
  router.post("/DeviceRestV10/Authorize", createAuthorizeHandler(config));

  // Step 3: Authenticated operations
  router.get("/DeviceRestV10/status/:timestamp", requireDeviceToken, createStatusHandler(config));
  router.get("/DeviceRestV10/settings", requireDeviceToken, handleSettings);
  router.get("/DeviceRestV10/collection", requireDeviceToken, handleCollection);
  router.get("/DeviceRestV10/entity/:entityID", requireDeviceToken, createEntityHandler(config));
  router.delete("/DeviceRestV10/entity/:entityID", requireDeviceToken, createEntityHandler(config));
  router.get("/DeviceRestV10/profile/:profileID", requireDeviceToken, handleProfile);

  // Firmware update blocking
  router.get("/go/update{*path}", handleFirmwareCheck);

  return router;
}
