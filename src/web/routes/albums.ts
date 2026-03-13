import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../../db/database.js";
import { requireAuth } from "../auth-middleware.js";
import { notifyCollectionChange } from "../../kodak-api/status.js";

const router = Router();
router.use(requireAuth);

router.get("/", (_req, res) => {
  const db = getDb();
  const albums = db.prepare("SELECT id, name, sortOrder, createdAt FROM albums ORDER BY sortOrder ASC").all();
  res.json(albums);
});

router.post("/", (req, res) => {
  const { name, sortOrder } = req.body;
  if (!name) {
    res.status(400).json({ error: "Album name required" });
    return;
  }
  const db = getDb();
  const id = uuidv4();
  const order = sortOrder ?? 0;
  db.prepare("INSERT INTO albums (id, name, sortOrder, createdAt) VALUES (?, ?, ?, ?)").run(id, name, order, new Date().toISOString());
  notifyCollectionChange();
  res.json({ id, name, sortOrder: order });
});

router.put("/:id", (req, res) => {
  const db = getDb();
  const album = db.prepare("SELECT id FROM albums WHERE id = ?").get(req.params.id);
  if (!album) {
    res.status(404).json({ error: "Album not found" });
    return;
  }
  const { name, sortOrder } = req.body;
  if (name !== undefined) {
    db.prepare("UPDATE albums SET name = ? WHERE id = ?").run(name, req.params.id);
  }
  if (sortOrder !== undefined) {
    db.prepare("UPDATE albums SET sortOrder = ? WHERE id = ?").run(sortOrder, req.params.id);
  }
  notifyCollectionChange();
  const updated = db.prepare("SELECT id, name, sortOrder, createdAt FROM albums WHERE id = ?").get(req.params.id);
  res.json(updated);
});

router.delete("/:id", (req, res) => {
  const db = getDb();
  const album = db.prepare("SELECT id FROM albums WHERE id = ?").get(req.params.id);
  if (!album) {
    res.status(404).json({ error: "Album not found" });
    return;
  }
  db.prepare("DELETE FROM album_photos WHERE albumId = ?").run(req.params.id);
  db.prepare("DELETE FROM device_albums WHERE albumId = ?").run(req.params.id);
  db.prepare("DELETE FROM albums WHERE id = ?").run(req.params.id);
  notifyCollectionChange();
  res.json({ success: true });
});

router.post("/:id/photos", (req, res) => {
  const db = getDb();
  const album = db.prepare("SELECT id FROM albums WHERE id = ?").get(req.params.id);
  if (!album) {
    res.status(404).json({ error: "Album not found" });
    return;
  }
  const { photoIds } = req.body;
  if (!Array.isArray(photoIds) || photoIds.length === 0) {
    res.status(400).json({ error: "photoIds array required" });
    return;
  }
  const insert = db.prepare("INSERT OR IGNORE INTO album_photos (albumId, photoId, sortOrder) VALUES (?, ?, ?)");
  for (let i = 0; i < photoIds.length; i++) {
    insert.run(req.params.id, photoIds[i], i);
  }
  notifyCollectionChange();
  res.json({ success: true });
});

router.delete("/:albumId/photos/:photoId", (req, res) => {
  const db = getDb();
  db.prepare("DELETE FROM album_photos WHERE albumId = ? AND photoId = ?").run(req.params.albumId, req.params.photoId);
  notifyCollectionChange();
  res.json({ success: true });
});

router.put("/:id/photo-order", (req, res) => {
  const db = getDb();
  const album = db.prepare("SELECT id FROM albums WHERE id = ?").get(req.params.id);
  if (!album) {
    res.status(404).json({ error: "Album not found" });
    return;
  }
  const { photoIds } = req.body;
  if (!Array.isArray(photoIds)) {
    res.status(400).json({ error: "photoIds array required" });
    return;
  }
  const update = db.prepare("UPDATE album_photos SET sortOrder = ? WHERE albumId = ? AND photoId = ?");
  for (let i = 0; i < photoIds.length; i++) {
    update.run(i, req.params.id, photoIds[i]);
  }
  notifyCollectionChange();
  res.json({ success: true });
});

export default router;
