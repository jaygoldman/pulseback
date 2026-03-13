import { Router } from "express";
import { getDb } from "../../db/database.js";
import { requireAuth } from "../auth-middleware.js";
import { notifyCollectionChange } from "../../kodak-api/status.js";

const router = Router();
router.use(requireAuth);

router.get("/", (_req, res) => {
  const db = getDb();
  const rows = db.prepare("SELECT id, name, macAddress, firmwareVersion, storageInfo, lastSeen, registeredAt FROM devices").all() as any[];
  const devices = rows.map((d) => ({
    ...d,
    storageInfo: d.storageInfo ? JSON.parse(d.storageInfo) : null,
  }));
  res.json(devices);
});

router.put("/:id", (req, res) => {
  const db = getDb();
  const device = db.prepare("SELECT id FROM devices WHERE id = ?").get(req.params.id);
  if (!device) {
    res.status(404).json({ error: "Device not found" });
    return;
  }
  const { name } = req.body;
  if (name !== undefined) {
    db.prepare("UPDATE devices SET name = ? WHERE id = ?").run(name, req.params.id);
  }
  const updated = db.prepare("SELECT id, name, macAddress, firmwareVersion, storageInfo, lastSeen, registeredAt FROM devices WHERE id = ?").get(req.params.id) as any;
  res.json({
    ...updated,
    storageInfo: updated.storageInfo ? JSON.parse(updated.storageInfo) : null,
  });
});

router.get("/:id/albums", (req, res) => {
  const db = getDb();
  const device = db.prepare("SELECT id FROM devices WHERE id = ?").get(req.params.id);
  if (!device) {
    res.status(404).json({ error: "Device not found" });
    return;
  }
  const albums = db.prepare(
    "SELECT a.id, a.name, a.sortOrder, a.createdAt FROM albums a INNER JOIN device_albums da ON a.id = da.albumId WHERE da.deviceId = ? ORDER BY a.sortOrder ASC"
  ).all(req.params.id);
  res.json(albums);
});

router.put("/:id/albums", (req, res) => {
  const db = getDb();
  const device = db.prepare("SELECT id FROM devices WHERE id = ?").get(req.params.id);
  if (!device) {
    res.status(404).json({ error: "Device not found" });
    return;
  }
  const { albumIds } = req.body;
  if (!Array.isArray(albumIds)) {
    res.status(400).json({ error: "albumIds array required" });
    return;
  }
  db.prepare("DELETE FROM device_albums WHERE deviceId = ?").run(req.params.id);
  const insert = db.prepare("INSERT INTO device_albums (deviceId, albumId) VALUES (?, ?)");
  for (const albumId of albumIds) {
    insert.run(req.params.id, albumId);
  }
  notifyCollectionChange();
  res.json({ success: true });
});

export default router;
