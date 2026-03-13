import { Router } from "express";
import multer from "multer";
import { join } from "node:path";
import { unlinkSync } from "node:fs";
import { getDb } from "../../db/database.js";
import { importPhoto } from "../../photos/import.js";
import { requireAuth } from "../auth-middleware.js";
import type { Config } from "../../config.js";

export function createPhotosRouter(config: Config): Router {
  const router = Router();
  const upload = multer({ dest: join(config.dataDir, "uploads-tmp") });
  router.use(requireAuth);

  router.get("/", (_req, res) => {
    const db = getDb();
    const photos = db.prepare("SELECT id, filename, displayPath, width, height, dateTaken, importedAt, fileSize FROM photos ORDER BY importedAt DESC").all();
    res.json(photos);
  });

  router.post("/", upload.array("photos", 50), async (req, res) => {
    const files = req.files as Express.Multer.File[];
    if (!files?.length) {
      res.status(400).json({ error: "No files uploaded" });
      return;
    }
    const results = [];
    for (const file of files) {
      const result = await importPhoto(file.path, file.originalname, config.dataDir);
      results.push(result);
      try { unlinkSync(file.path); } catch {}
    }
    res.json({ results });
  });

  router.delete("/:id", (req, res) => {
    const db = getDb();
    const photo = db.prepare("SELECT id, originalPath, displayPath FROM photos WHERE id = ?").get(req.params.id) as any;
    if (!photo) {
      res.status(404).json({ error: "Photo not found" });
      return;
    }
    db.prepare("DELETE FROM album_photos WHERE photoId = ?").run(photo.id);
    db.prepare("DELETE FROM photos WHERE id = ?").run(photo.id);
    try { unlinkSync(photo.originalPath); } catch {}
    try { unlinkSync(photo.displayPath); } catch {}
    res.json({ success: true });
  });

  return router;
}
