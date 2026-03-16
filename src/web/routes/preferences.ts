import { Router } from "express";
import { getDb } from "../../db/database.js";
import { requireAuth } from "../auth-middleware.js";

const VALID_ERAS = new Set(["1950s", "1960s", "1970s", "1980s", "1990s", "2000s"]);

function readPreferences(): Record<string, string> {
  const db = getDb();
  const rows = db.prepare("SELECT key, value FROM preferences").all() as { key: string; value: string }[];
  const prefs: Record<string, string> = {};
  for (const row of rows) {
    prefs[row.key] = row.value;
  }
  if (!prefs.era) prefs.era = "1970s";
  return prefs;
}

const router = Router();

// GET — no auth required (Mac app reads before login)
router.get("/", (_req, res) => {
  res.json(readPreferences());
});

// PUT — requires auth
router.put("/", requireAuth, (req, res) => {
  const db = getDb();
  const updates = req.body as Record<string, unknown>;
  const upsert = db.prepare(
    "INSERT INTO preferences (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  );
  db.transaction(() => {
    for (const [key, value] of Object.entries(updates)) {
      if (typeof value !== "string") continue;
      if (key === "era" && !VALID_ERAS.has(value)) continue;
      upsert.run(key, value);
    }
  })();
  res.json(readPreferences());
});

export default router;
