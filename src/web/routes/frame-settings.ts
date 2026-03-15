import { Router } from "express";
import { getDb } from "../../db/database.js";
import { requireAuth } from "../auth-middleware.js";

const router = Router();
router.use(requireAuth);

router.get("/:id/settings", (req, res) => {
  const db = getDb();
  const settings = db
    .prepare("SELECT * FROM settings WHERE deviceId = ?")
    .get(req.params.id) as any;

  if (!settings) {
    res.status(404).json({ error: "Device not found" });
    return;
  }

  res.json(settings);
});

router.put("/:id/settings", (req, res) => {
  const db = getDb();
  const existing = db
    .prepare("SELECT deviceId FROM settings WHERE deviceId = ?")
    .get(req.params.id);

  if (!existing) {
    res.status(404).json({ error: "Device not found" });
    return;
  }

  const { slideshowDuration, transitionType, displayMode, brightness, timezone, language } = req.body;

  const fields: string[] = [];
  const values: any[] = [];

  if (slideshowDuration !== undefined) { fields.push("slideshowDuration = ?"); values.push(slideshowDuration); }
  if (transitionType !== undefined) { fields.push("transitionType = ?"); values.push(transitionType); }
  if (displayMode !== undefined) { fields.push("displayMode = ?"); values.push(displayMode); }
  if (brightness !== undefined) { fields.push("brightness = ?"); values.push(brightness); }
  if (timezone !== undefined) { fields.push("timezone = ?"); values.push(timezone); }
  if (language !== undefined) { fields.push("language = ?"); values.push(language); }

  if (fields.length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  values.push(req.params.id);
  db.prepare(`UPDATE settings SET ${fields.join(", ")} WHERE deviceId = ?`).run(...values);

  const updated = db
    .prepare("SELECT * FROM settings WHERE deviceId = ?")
    .get(req.params.id);
  res.json(updated);
});

export default router;
