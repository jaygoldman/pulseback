# Pulseback Server-Side Changes for Mac App

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add server-side features required by the Pulseback Mac app: preferences API, data directory override, enhanced health endpoint, and web UI era sync.

**Architecture:** Four small, independent changes to the existing Pulseback server. Each produces working, testable code on its own.

**Tech Stack:** TypeScript, Express, better-sqlite3, React

**Spec:** `docs/superpowers/specs/2026-03-16-pulseback-mac-app-design.md` (Server-Side Changes section)

---

## File Structure

```
Changes to existing files:
  src/config.ts                          # Add KPS_DATA_DIR env var support
  src/web/routes/health.ts               # Add connectedDevices count
  src/web/router.ts                      # Mount preferences route
  web-ui/src/theme.ts                    # Migrate era persistence to API
  web-ui/src/App.tsx                     # Use API for era sync

New files:
  src/db/migrations/002-preferences.ts   # Add preferences table
  src/web/routes/preferences.ts          # GET/PUT /api/preferences
```

---

## Chunk 1: Server-Side Changes

### Task 1: Data Directory Override

**Files:**
- Modify: `src/config.ts`

The `DATA_DIR` constant is currently hardcoded to `join(process.cwd(), "data")`. Add support for the `KPS_DATA_DIR` environment variable so the Mac app can point to `~/Library/Application Support/Pulseback/`.

- [ ] **Step 1: Update DATA_DIR to respect environment variable**

In `src/config.ts`, change line 25 from:
```typescript
const DATA_DIR = join(process.cwd(), "data");
```
to:
```typescript
const DATA_DIR = process.env.KPS_DATA_DIR ?? join(process.cwd(), "data");
```

- [ ] **Step 2: Also update the config.json path in loadConfig**

The `configPath` on line 68 uses `DATA_DIR` which is now dynamic — this already works since `DATA_DIR` is module-level. Verify that `watchedFolder` default also uses the dynamic `DATA_DIR` (line 42) — it does. No code change needed, just verify.

- [ ] **Step 3: Run tests to verify nothing breaks**

```bash
npx vitest run
```
Expected: All 13 tests pass

- [ ] **Step 4: Commit**

```bash
git add src/config.ts
git commit -m "feat: support KPS_DATA_DIR env var for custom data directory"
```

---

### Task 2: Preferences API

**Files:**
- Create: `src/db/migrations/002-preferences.ts`
- Create: `src/web/routes/preferences.ts`
- Modify: `src/db/database.ts` (add migration import)
- Modify: `src/web/router.ts` (mount route)

- [ ] **Step 1: Create migration 002-preferences**

```typescript
// src/db/migrations/002-preferences.ts
import type Database from "better-sqlite3";

export const version = 2;

export function up(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS preferences (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}
```

- [ ] **Step 2: Register the migration in database.ts**

In `src/db/database.ts`, add the import:
```typescript
import * as migration002 from "./migrations/002-preferences.js";
```

Update the migrations array:
```typescript
const migrations = [migration001, migration002];
```

- [ ] **Step 3: Create the preferences route**

```typescript
// src/web/routes/preferences.ts
import { Router } from "express";
import { getDb } from "../../db/database.js";
import { requireAuth } from "../auth-middleware.js";

const VALID_ERAS = new Set(["1950s", "1960s", "1970s", "1980s", "1990s", "2000s"]);

const router = Router();

// GET /api/preferences — no auth required (Mac app reads before login)
router.get("/", (_req, res) => {
  const db = getDb();
  const rows = db.prepare("SELECT key, value FROM preferences").all() as { key: string; value: string }[];
  const prefs: Record<string, string> = {};
  for (const row of rows) {
    prefs[row.key] = row.value;
  }
  // Default era if not set
  if (!prefs.era) {
    prefs.era = "1970s";
  }
  res.json(prefs);
});

// PUT /api/preferences — requires auth
router.put("/", requireAuth, (req, res) => {
  const db = getDb();
  const updates = req.body as Record<string, unknown>;

  const upsert = db.prepare(
    "INSERT INTO preferences (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  );

  db.transaction(() => {
    for (const [key, value] of Object.entries(updates)) {
      if (typeof value !== "string") continue;
      // Validate era values
      if (key === "era" && !VALID_ERAS.has(value)) continue;
      upsert.run(key, value);
    }
  })();

  // Return updated preferences
  const rows = db.prepare("SELECT key, value FROM preferences").all() as { key: string; value: string }[];
  const prefs: Record<string, string> = {};
  for (const row of rows) {
    prefs[row.key] = row.value;
  }
  if (!prefs.era) prefs.era = "1970s";
  res.json(prefs);
});

export default router;
```

- [ ] **Step 4: Mount the route in web router**

In `src/web/router.ts`, add import:
```typescript
import preferencesRouter from "./routes/preferences.js";
```

Add after the setup route mount (after line 22):
```typescript
  router.use("/api/preferences", preferencesRouter);
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run
```
Expected: All tests pass (migration runs automatically)

- [ ] **Step 6: Manually verify the endpoint works**

```bash
# Start server
npm run dev &

# Test GET (no auth)
curl http://localhost:3000/api/preferences
# Expected: {"era":"1970s"}

# Kill server
kill %1
```

- [ ] **Step 7: Commit**

```bash
git add src/db/migrations/002-preferences.ts src/db/database.ts src/web/routes/preferences.ts src/web/router.ts
git commit -m "feat: add preferences API for era theme syncing"
```

---

### Task 3: Enhanced Health Endpoint

**Files:**
- Modify: `src/web/routes/health.ts`

Add `connectedDevices` count — devices with `lastSeen` within 2x the polling period (default 60 seconds).

- [ ] **Step 1: Update health route**

Replace the contents of `src/web/routes/health.ts` with:

```typescript
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

  // Database check
  try {
    getDb().prepare("SELECT 1").get();
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  // Registered service checks
  for (const [name, check] of Object.entries(serviceChecks)) {
    checks[name] = check() ? "ok" : "error";
  }

  // Connected devices count (lastSeen within 2x polling period)
  // Note: polling period is not available here without config injection,
  // so we use a generous 120-second window that works for all reasonable polling periods
  let connectedDevices = 0;
  try {
    const cutoff = new Date(Date.now() - 120000).toISOString();
    const row = getDb()
      .prepare("SELECT COUNT(*) as count FROM devices WHERE lastSeen > ?")
      .get(cutoff) as { count: number };
    connectedDevices = row.count;
  } catch {
    // Ignore — devices table may not exist yet
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
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run
```
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add src/web/routes/health.ts
git commit -m "feat: add connectedDevices count to health endpoint"
```

---

### Task 4: Web UI Era Sync via API

**Files:**
- Modify: `web-ui/src/theme.ts`
- Modify: `web-ui/src/App.tsx`

Migrate the web UI's era persistence from localStorage-only to API-backed with localStorage as a fast cache.

- [ ] **Step 1: Update theme.ts era persistence functions**

In `web-ui/src/theme.ts`, replace the persistence section (the `STORAGE_KEY`, `loadEra`, and `saveEra` functions) with:

```typescript
// ─── Persistence ───────────────────────────────────────────────────

const STORAGE_KEY = "pulseback_era";

export function loadEra(): KodakEra {
  // Fast load from localStorage cache
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && saved in eras) return saved as KodakEra;
  return "1970s";
}

export function saveEra(era: KodakEra): void {
  // Write to localStorage cache immediately
  localStorage.setItem(STORAGE_KEY, era);
  // Persist to server API (fire-and-forget)
  const token = localStorage.getItem("kps_token");
  if (token) {
    fetch("/api/preferences", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ era }),
    }).catch(() => {
      // Ignore — localStorage is the fallback
    });
  }
}

export async function loadEraFromServer(): Promise<KodakEra> {
  try {
    const res = await fetch("/api/preferences");
    if (res.ok) {
      const prefs = await res.json();
      if (prefs.era && prefs.era in eras) {
        localStorage.setItem(STORAGE_KEY, prefs.era);
        return prefs.era as KodakEra;
      }
    }
  } catch {
    // Ignore — use localStorage fallback
  }
  return loadEra();
}
```

- [ ] **Step 2: Update App.tsx to sync from server on mount**

In `web-ui/src/App.tsx`, update imports:
```typescript
import { ThemeContext, eras, loadEra, saveEra, loadEraFromServer, type KodakEra } from "./theme";
```

Add a `useEffect` inside the `App` component to sync from server on mount:
```typescript
import { useState, useCallback, useEffect } from "react";

// ... inside App():
  const [era, setEraState] = useState<KodakEra>(loadEra);

  const setEra = useCallback((newEra: KodakEra) => {
    setEraState(newEra);
    saveEra(newEra);
  }, []);

  // Sync era from server on mount
  useEffect(() => {
    loadEraFromServer().then((serverEra) => {
      if (serverEra !== era) {
        setEraState(serverEra);
      }
    });
  }, []);
```

- [ ] **Step 3: Build frontend**

```bash
cd web-ui && npm run build
```
Expected: Build succeeds

- [ ] **Step 4: Run backend tests**

```bash
cd .. && npx vitest run
```
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add web-ui/src/theme.ts web-ui/src/App.tsx
git commit -m "feat: sync era theme preference via server API with localStorage cache"
```
