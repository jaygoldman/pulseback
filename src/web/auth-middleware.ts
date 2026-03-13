import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

let jwtSecret: string | null = null;

export function initJwtSecret(dataDir: string): void {
  const secretPath = join(dataDir, "jwt-secret.key");
  if (existsSync(secretPath)) {
    jwtSecret = readFileSync(secretPath, "utf-8").trim();
  } else {
    jwtSecret = randomBytes(64).toString("hex");
    writeFileSync(secretPath, jwtSecret, { mode: 0o600 });
  }
}

export function getJwtSecret(): string {
  if (!jwtSecret) throw new Error("JWT secret not initialized");
  return jwtSecret;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, getJwtSecret()) as any;
    (req as any).user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user;
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}
