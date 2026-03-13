import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import { getDb } from "../../db/database.js";

const router = Router();

router.get("/status", (_req, res) => {
  const db = getDb();
  const user = db.prepare("SELECT id FROM users LIMIT 1").get();
  res.json({ setupComplete: !!user });
});

router.post("/", async (req, res) => {
  const db = getDb();
  const existing = db.prepare("SELECT id FROM users LIMIT 1").get();
  if (existing) {
    res.status(400).json({ error: "Setup already complete" });
    return;
  }
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "Username and password required" });
    return;
  }
  const hash = await bcrypt.hash(password, 10);
  const id = uuidv4();
  db.prepare("INSERT INTO users (id, username, passwordHash, role, createdAt) VALUES (?, ?, ?, ?, ?)").run(id, username, hash, "admin", new Date().toISOString());
  res.json({ success: true });
});

export default router;
