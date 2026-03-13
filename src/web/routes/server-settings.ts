import { Router } from "express";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { requireAuth, requireAdmin } from "../auth-middleware.js";
import type { Config } from "../../config.js";

export function createServerSettingsRouter(config: Config): Router {
  const router = Router();
  router.use(requireAuth);
  router.use(requireAdmin);

  const configPath = join(config.dataDir, "config.json");

  router.get("/", (_req, res) => {
    if (!existsSync(configPath)) {
      res.json({});
      return;
    }
    try {
      const raw = readFileSync(configPath, "utf-8");
      res.json(JSON.parse(raw));
    } catch {
      res.status(500).json({ error: "Failed to read config" });
    }
  });

  router.put("/", (req, res) => {
    try {
      writeFileSync(configPath, JSON.stringify(req.body, null, 2), "utf-8");
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Failed to write config" });
    }
  });

  return router;
}
