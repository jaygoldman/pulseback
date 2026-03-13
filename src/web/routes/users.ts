import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import { getDb } from "../../db/database.js";
import { requireAuth, requireAdmin } from "../auth-middleware.js";

const router = Router();
router.use(requireAuth);
router.use(requireAdmin);

router.get("/", (_req, res) => {
  const db = getDb();
  const users = db.prepare("SELECT id, username, role, createdAt FROM users").all();
  res.json(users);
});

router.post("/", async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "Username and password required" });
    return;
  }
  const db = getDb();
  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (existing) {
    res.status(409).json({ error: "Username already exists" });
    return;
  }
  const hash = await bcrypt.hash(password, 10);
  const id = uuidv4();
  const userRole = role ?? "user";
  db.prepare("INSERT INTO users (id, username, passwordHash, role, createdAt) VALUES (?, ?, ?, ?, ?)").run(id, username, hash, userRole, new Date().toISOString());
  res.json({ id, username, role: userRole });
});

router.delete("/:id", (req, res) => {
  const db = getDb();
  const user = db.prepare("SELECT id, role FROM users WHERE id = ?").get(req.params.id) as any;
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (user.role === "admin") {
    const adminCount = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get() as any).count;
    if (adminCount <= 1) {
      res.status(400).json({ error: "Cannot delete the last admin user" });
      return;
    }
  }
  db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

export default router;
