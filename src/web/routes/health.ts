import { Router } from "express";
import { getDb } from "../../db/database.js";

const startTime = Date.now();
const serviceChecks: Record<string, () => boolean> = {};

export function registerServiceCheck(name: string, check: () => boolean): void {
  serviceChecks[name] = check;
}

const router = Router();

router.get("/", (_req, res) => {
  const checks: Record<string, string> = {};

  try {
    getDb().prepare("SELECT 1").get();
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  for (const [name, check] of Object.entries(serviceChecks)) {
    checks[name] = check() ? "ok" : "error";
  }

  // Connected devices (lastSeen within 120 seconds)
  let connectedDevices = 0;
  try {
    const cutoff = new Date(Date.now() - 120000).toISOString();
    const row = getDb()
      .prepare("SELECT COUNT(*) as count FROM devices WHERE lastSeen > ?")
      .get(cutoff) as { count: number };
    connectedDevices = row.count;
  } catch {
    // Ignore
  }

  const allOk = Object.values(checks).every((v) => v === "ok");

  res.status(allOk ? 200 : 503).json({
    status: allOk ? "healthy" : "degraded",
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks,
    connectedDevices,
  });
});

export default router;
