import { Router } from "express";
import { getDb } from "../../db/database.js";
import { requireAuth } from "../auth-middleware.js";

const ALLOWED_SETTINGS = new Set([
  "slideshowDuration",
  "transitionType",
  "displayMode",
  "brightness",
  "timezone",
  "language",
]);

const router = Router();
router.use(requireAuth);

router.get("/:id/settings", (req, res) => {
  const db = getDb();
  const device = db.prepare("SELECT id FROM devices WHERE id = ?").get(req.params.id);
  if (!device) {
    res.status(404).json({ error: "Device not found" });
    return;
  }
  const rows = db.prepare("SELECT key, value FROM settings WHERE deviceId = ?").all(req.params.id) as any[];
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  res.json(settings);
});

router.put("/:id/settings", (req, res) => {
  const db = getDb();
  const device = db.prepare("SELECT id FROM devices WHERE id = ?").get(req.params.id);
  if (!device) {
    res.status(404).json({ error: "Device not found" });
    return;
  }
  const updates = req.body as Record<string, unknown>;
  const upsert = db.prepare(
    "INSERT INTO settings (deviceId, key, value) VALUES (?, ?, ?) ON CONFLICT(deviceId, key) DO UPDATE SET value = excluded.value"
  );
  for (const [key, value] of Object.entries(updates)) {
    if (ALLOWED_SETTINGS.has(key) && value !== undefined) {
      upsert.run(req.params.id, key, String(value));
    }
  }
  const rows = db.prepare("SELECT key, value FROM settings WHERE deviceId = ?").all(req.params.id) as any[];
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  res.json(settings);
});

export default router;
