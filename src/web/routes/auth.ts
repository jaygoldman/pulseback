import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getDb } from "../../db/database.js";
import { getJwtSecret } from "../auth-middleware.js";
import { loginRateLimit } from "../rate-limit.js";
import type { Config } from "../../config.js";

export function createAuthRouter(config: Config): Router {
  const router = Router();

  router.post("/login", loginRateLimit(), async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "Username and password required" });
      return;
    }
    const db = getDb();
    const user = db.prepare("SELECT id, username, passwordHash, role FROM users WHERE username = ?").get(username) as any;
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, getJwtSecret(), { expiresIn: `${config.jwt.expiryHours}h` });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  });

  return router;
}
