# Kodak Pulse Local Server Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local Node.js/TypeScript server that replaces the defunct Kodak Cloud Services for the Kodak Pulse W1030 digital picture frame, with a retro-Kodak-themed web UI for photo management.

**Architecture:** Single Express monolith handling DNS proxy, Kodak REST/XML API, photo management, and web UI. SQLite for persistence, sharp for image processing, React/Vite for frontend. Runs as unprivileged macOS launchd service with pfctl port forwarding.

**Tech Stack:** TypeScript, Express, dns2, better-sqlite3, sharp, xml2js, React, Vite, bcrypt, jsonwebtoken, chokidar, selfsigned

**Spec:** `docs/superpowers/specs/2026-03-13-kodak-pulse-server-design.md`

**Reference implementation:** https://github.com/hn/kodak-pulse-picture-frame-server (PHP proof-of-concept)

---

## File Structure

```
kodak-pulse-server/
├── package.json
├── tsconfig.json
├── .gitignore
├── src/
│   ├── server.ts                          # Entry point — starts all services, graceful shutdown
│   ├── config.ts                          # Config loading (env > config.json > defaults)
│   ├── logger.ts                          # Structured JSON logger with daily rotation
│   ├── dns/
│   │   ├── dns-proxy.ts                   # DNS proxy server (dns2)
│   │   └── dns-proxy.test.ts
│   ├── db/
│   │   ├── database.ts                    # DB init, connection, migration runner
│   │   ├── migrations/
│   │   │   └── 001-initial.ts             # Initial schema (all tables)
│   │   └── database.test.ts
│   ├── ssl/
│   │   └── cert.ts                        # Self-signed cert generation
│   ├── kodak-api/
│   │   ├── router.ts                      # Express router mounting all Kodak endpoints
│   │   ├── xml.ts                         # XML building/parsing helpers
│   │   ├── device-token.ts                # DeviceToken validation middleware
│   │   ├── activate.ts                    # POST /DeviceRest/activate
│   │   ├── authorize.ts                   # POST /DeviceRestV10/Authorize
│   │   ├── status.ts                      # GET /DeviceRestV10/status/:timestamp
│   │   ├── settings.ts                    # GET /DeviceRestV10/settings
│   │   ├── collection.ts                  # GET /DeviceRestV10/collection
│   │   ├── entity.ts                      # GET/DELETE /DeviceRestV10/entity/:entityID
│   │   ├── profile.ts                     # GET /DeviceRestV10/profile/:profileID
│   │   ├── firmware.ts                    # GET /go/update* (firmware block)
│   │   └── kodak-api.test.ts
│   ├── photos/
│   │   ├── import.ts                      # Import pipeline (UUID, store, resize, EXIF, DB)
│   │   ├── resize.ts                      # Sharp resize/crop to 800x600
│   │   ├── watcher.ts                     # Chokidar watched folder
│   │   └── photos.test.ts
│   └── web/
│       ├── router.ts                      # Web API Express router (mounts all routes)
│       ├── auth-middleware.ts             # JWT verification middleware
│       ├── rate-limit.ts                  # Login rate limiter
│       ├── routes/
│       │   ├── setup.ts                   # POST /api/setup (first-run wizard)
│       │   ├── auth.ts                    # POST /api/login, POST /api/logout
│       │   ├── photos.ts                  # CRUD /api/photos
│       │   ├── albums.ts                  # CRUD /api/albums
│       │   ├── devices.ts                 # GET/PUT /api/devices
│       │   ├── frame-settings.ts          # GET/PUT /api/devices/:id/settings
│       │   ├── users.ts                   # CRUD /api/users (admin only)
│       │   ├── server-settings.ts         # GET/PUT /api/server-settings (admin only)
│       │   └── health.ts                  # GET /health
│       └── web.test.ts
├── web-ui/
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── tsconfig.json
│   └── src/
│       ├── main.tsx                       # React entry point
│       ├── App.tsx                        # Router, auth context, layout
│       ├── api.ts                         # API client with JWT handling
│       ├── theme.ts                       # Retro Kodak design tokens
│       ├── components/
│       │   ├── Layout.tsx                 # App shell with nav, film-strip motifs
│       │   ├── PhotoGrid.tsx              # Photo grid (prints-on-table style)
│       │   ├── PhotoUpload.tsx            # Drag-and-drop upload zone
│       │   ├── AlbumCard.tsx              # Album thumbnail card
│       │   ├── DeviceStatus.tsx           # Frame online/offline indicator
│       │   └── ProtectedRoute.tsx         # Auth guard component
│       └── pages/
│           ├── SetupWizard.tsx            # First-run admin account creation
│           ├── Login.tsx                  # Login page
│           ├── Dashboard.tsx              # Frame status, quick stats
│           ├── Photos.tsx                 # Photo management page
│           ├── Albums.tsx                 # Album management page
│           ├── FrameSettings.tsx          # Frame display settings
│           ├── Devices.tsx                # Device management
│           ├── Users.tsx                  # User management (admin)
│           └── ServerSettings.tsx         # Server config (admin)
├── scripts/
│   ├── install.sh                         # Install launchd plist + pfctl rules
│   └── uninstall.sh                       # Remove launchd plist + pfctl rules
├── deploy/
│   ├── com.kodak-pulse.server.plist       # launchd plist
│   └── com.kodak-pulse.pfctl.plist        # pfctl anchor loader plist
└── data/                                  # Created at runtime, gitignored
```

---

## Chunk 1: Foundation

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`

- [ ] **Step 1: Initialize package.json**

```bash
cd /Users/jaygoldman/Dev/kodak-pulse-server
npm init -y
```

- [ ] **Step 2: Install dependencies**

```bash
npm install express dns2 better-sqlite3 sharp xml2js selfsigned bcrypt jsonwebtoken chokidar uuid cors multer exif-reader
npm install -D typescript @types/node @types/express @types/better-sqlite3 @types/xml2js @types/bcrypt @types/jsonwebtoken @types/uuid @types/cors @types/multer vitest tsx
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "web-ui"]
}
```

- [ ] **Step 4: Create .gitignore**

```
node_modules/
dist/
data/
web-ui/node_modules/
web-ui/dist/
*.tgz
.DS_Store
```

- [ ] **Step 5: Add scripts to package.json**

Add to `package.json` scripts:
```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc && cd web-ui && npm run build",
    "start": "node dist/server.js",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add package.json tsconfig.json .gitignore package-lock.json
git commit -m "feat: initialize project with TypeScript, Express, and dependencies"
```

---

### Task 2: Config Module

**Files:**
- Create: `src/config.ts`

The config module loads settings with precedence: environment variable > `data/config.json` > built-in defaults. It also ensures `data/` subdirectories exist on startup.

- [ ] **Step 1: Write config module**

```typescript
// src/config.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { networkInterfaces } from "node:os";

export interface Config {
  ports: {
    dns: number;
    http: number;
    https: number;
    webUi: number;
  };
  dns: {
    upstream: string;
    interceptedHosts: string[];
  };
  watchedFolder: string;
  dataDir: string;
  logLevel: "debug" | "info" | "warn" | "error";
  jwt: {
    expiryHours: number;
  };
  pollingPeriod: number;
}

const DATA_DIR = join(process.cwd(), "data");

const DEFAULTS: Config = {
  ports: {
    dns: 5353,
    http: 8080,
    https: 8443,
    webUi: 3000,
  },
  dns: {
    upstream: detectUpstreamDns(),
    interceptedHosts: [
      "device.pulse.kodak.com",
      "www.kodak.com",
      "download.kodak.com",
    ],
  },
  watchedFolder: join(DATA_DIR, "watch"),
  dataDir: DATA_DIR,
  logLevel: "info",
  jwt: {
    expiryHours: 24,
  },
  pollingPeriod: 30,
};

function detectUpstreamDns(): string {
  // Default fallback; on macOS, scutil --dns could be parsed
  // but 8.8.8.8 is a safe default
  return "8.8.8.8";
}

export function getServerIp(): string {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "127.0.0.1";
}

export function loadConfig(): Config {
  const configPath = join(DATA_DIR, "config.json");
  let fileConfig: Partial<Config> = {};

  if (existsSync(configPath)) {
    const raw = readFileSync(configPath, "utf-8");
    fileConfig = JSON.parse(raw);
  }

  const config: Config = {
    ports: {
      dns: envInt("KPS_PORT_DNS") ?? fileConfig.ports?.dns ?? DEFAULTS.ports.dns,
      http: envInt("KPS_PORT_HTTP") ?? fileConfig.ports?.http ?? DEFAULTS.ports.http,
      https: envInt("KPS_PORT_HTTPS") ?? fileConfig.ports?.https ?? DEFAULTS.ports.https,
      webUi: envInt("KPS_PORT_WEBUI") ?? fileConfig.ports?.webUi ?? DEFAULTS.ports.webUi,
    },
    dns: {
      upstream: process.env.KPS_DNS_UPSTREAM ?? fileConfig.dns?.upstream ?? DEFAULTS.dns.upstream,
      interceptedHosts: fileConfig.dns?.interceptedHosts ?? DEFAULTS.dns.interceptedHosts,
    },
    watchedFolder: process.env.KPS_WATCH_FOLDER ?? fileConfig.watchedFolder ?? DEFAULTS.watchedFolder,
    dataDir: DATA_DIR,
    logLevel: (process.env.KPS_LOG_LEVEL as Config["logLevel"]) ?? fileConfig.logLevel ?? DEFAULTS.logLevel,
    jwt: {
      expiryHours: envInt("KPS_JWT_EXPIRY_HOURS") ?? fileConfig.jwt?.expiryHours ?? DEFAULTS.jwt.expiryHours,
    },
    pollingPeriod: envInt("KPS_POLLING_PERIOD") ?? fileConfig.pollingPeriod ?? DEFAULTS.pollingPeriod,
  };

  ensureDataDirs(config);
  return config;
}

function envInt(key: string): number | undefined {
  const val = process.env[key];
  return val !== undefined ? parseInt(val, 10) : undefined;
}

function ensureDataDirs(config: Config): void {
  const dirs = [
    config.dataDir,
    join(config.dataDir, "photos", "originals"),
    join(config.dataDir, "photos", "display"),
    config.watchedFolder,
    join(config.watchedFolder, "imported"),
    join(config.dataDir, "certs"),
    join(config.dataDir, "logs"),
  ];
  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/config.ts
git commit -m "feat: add config module with env/file/default precedence"
```

---

### Task 3: Logger Module

**Files:**
- Create: `src/logger.ts`

Structured JSON logger with configurable levels and daily file rotation.

- [ ] **Step 1: Write logger module**

```typescript
// src/logger.ts
import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let currentLevel: LogLevel = "info";
let logDir: string | null = null;

export function initLogger(level: LogLevel, dataDir: string): void {
  currentLevel = level;
  logDir = join(dataDir, "logs");
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }
}

function log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  if (LEVELS[level] < LEVELS[currentLevel]) return;

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };

  const line = JSON.stringify(entry);

  if (level === "error" || level === "warn") {
    process.stderr.write(line + "\n");
  } else {
    process.stdout.write(line + "\n");
  }

  if (logDir) {
    const date = new Date().toISOString().slice(0, 10);
    const logFile = join(logDir, `${date}.log`);
    appendFileSync(logFile, line + "\n");
  }
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => log("debug", message, meta),
  info: (message: string, meta?: Record<string, unknown>) => log("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log("error", message, meta),
};
```

- [ ] **Step 2: Commit**

```bash
git add src/logger.ts
git commit -m "feat: add structured JSON logger with daily rotation"
```

---

### Task 4: Database Module

**Files:**
- Create: `src/db/database.ts`
- Create: `src/db/migrations/001-initial.ts`
- Test: `src/db/database.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/db/database.test.ts
import { describe, it, expect, afterEach } from "vitest";
import { initDatabase, getDb, closeDb } from "./database.js";
import { existsSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const TEST_DATA_DIR = join(process.cwd(), "data-test");

describe("database", () => {
  afterEach(() => {
    closeDb();
    if (existsSync(TEST_DATA_DIR)) {
      rmSync(TEST_DATA_DIR, { recursive: true });
    }
  });

  it("creates database and runs migrations", () => {
    mkdirSync(TEST_DATA_DIR, { recursive: true });
    initDatabase(TEST_DATA_DIR);
    const db = getDb();

    // Check all tables exist
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all()
      .map((r: any) => r.name);

    expect(tables).toContain("devices");
    expect(tables).toContain("photos");
    expect(tables).toContain("albums");
    expect(tables).toContain("album_photos");
    expect(tables).toContain("device_albums");
    expect(tables).toContain("settings");
    expect(tables).toContain("users");
    expect(tables).toContain("schema_version");
  });

  it("is idempotent — running migrations twice does not error", () => {
    mkdirSync(TEST_DATA_DIR, { recursive: true });
    initDatabase(TEST_DATA_DIR);
    closeDb();
    // Second init should not throw
    initDatabase(TEST_DATA_DIR);
    const db = getDb();
    const version = db.prepare("SELECT version FROM schema_version").get() as any;
    expect(version.version).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/db/database.test.ts
```
Expected: FAIL — modules not found

- [ ] **Step 3: Write migration 001-initial**

```typescript
// src/db/migrations/001-initial.ts
import type Database from "better-sqlite3";

export const version = 1;

export function up(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      deviceID TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL DEFAULT 'Kodak Pulse',
      activationDate TEXT NOT NULL,
      lastSeen TEXT,
      storageInfo TEXT
    );

    CREATE TABLE IF NOT EXISTS photos (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      originalPath TEXT NOT NULL,
      displayPath TEXT NOT NULL,
      width INTEGER,
      height INTEGER,
      dateTaken TEXT,
      importedAt TEXT NOT NULL,
      fileSize INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS albums (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sortOrder INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS album_photos (
      albumId TEXT NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
      photoId TEXT NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
      sortOrder INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (albumId, photoId)
    );

    CREATE TABLE IF NOT EXISTS device_albums (
      deviceId TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      albumId TEXT NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
      PRIMARY KEY (deviceId, albumId)
    );

    CREATE TABLE IF NOT EXISTS settings (
      deviceId TEXT PRIMARY KEY REFERENCES devices(id) ON DELETE CASCADE,
      slideshowDuration INTEGER NOT NULL DEFAULT 10,
      transitionType TEXT NOT NULL DEFAULT 'FADE',
      displayMode TEXT NOT NULL DEFAULT 'ONEUP',
      brightness INTEGER NOT NULL DEFAULT 100,
      timezone TEXT NOT NULL DEFAULT '0:00:00+0:00',
      language TEXT NOT NULL DEFAULT 'en-us'
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER NOT NULL
    );
  `);
}
```

- [ ] **Step 4: Write database module**

```typescript
// src/db/database.ts
import BetterSqlite3 from "better-sqlite3";
import { join } from "node:path";
import { logger } from "../logger.js";

// Import migrations
import * as migration001 from "./migrations/001-initial.js";

const migrations = [migration001];

let db: BetterSqlite3.Database | null = null;

export function initDatabase(dataDir: string): void {
  const dbPath = join(dataDir, "kodak-pulse.db");
  db = new BetterSqlite3(dbPath);

  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  runMigrations(db);
  logger.info("Database initialized", { path: dbPath });
}

function runMigrations(db: BetterSqlite3.Database): void {
  // Ensure schema_version table exists
  db.exec(`CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)`);

  const row = db.prepare("SELECT version FROM schema_version").get() as
    | { version: number }
    | undefined;
  const currentVersion = row?.version ?? 0;

  for (const migration of migrations) {
    if (migration.version > currentVersion) {
      logger.info("Running migration", { version: migration.version });
      db.transaction(() => {
        migration.up(db!);
        if (currentVersion === 0) {
          db!.prepare("INSERT INTO schema_version (version) VALUES (?)").run(
            migration.version
          );
        } else {
          db!.prepare("UPDATE schema_version SET version = ?").run(
            migration.version
          );
        }
      })();
    }
  }
}

export function getDb(): BetterSqlite3.Database {
  if (!db) throw new Error("Database not initialized. Call initDatabase first.");
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run src/db/database.test.ts
```
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/db/
git commit -m "feat: add SQLite database module with migration system"
```

---

### Task 5: SSL Certificate Generation

**Files:**
- Create: `src/ssl/cert.ts`

- [ ] **Step 1: Write SSL cert module**

```typescript
// src/ssl/cert.ts
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import selfsigned from "selfsigned";
import { logger } from "../logger.js";

export interface SslCert {
  key: string;
  cert: string;
}

export function ensureSslCert(dataDir: string): SslCert {
  const certDir = join(dataDir, "certs");
  const keyPath = join(certDir, "server.key");
  const certPath = join(certDir, "server.crt");

  if (existsSync(keyPath) && existsSync(certPath)) {
    logger.info("Using existing SSL certificate");
    return {
      key: readFileSync(keyPath, "utf-8"),
      cert: readFileSync(certPath, "utf-8"),
    };
  }

  logger.info("Generating self-signed SSL certificate");
  const attrs = [{ name: "commonName", value: "device.pulse.kodak.com" }];
  const pems = selfsigned.generate(attrs, {
    days: 3650,
    keySize: 2048,
  });

  writeFileSync(keyPath, pems.private, { mode: 0o600 });
  writeFileSync(certPath, pems.cert, { mode: 0o644 });

  return {
    key: pems.private,
    cert: pems.cert,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/ssl/cert.ts
git commit -m "feat: add self-signed SSL certificate generation"
```

---

## Chunk 2: DNS Proxy

### Task 6: DNS Proxy

**Files:**
- Create: `src/dns/dns-proxy.ts`
- Test: `src/dns/dns-proxy.test.ts`

The DNS proxy intercepts Kodak hostnames and forwards everything else upstream.

- [ ] **Step 1: Write the failing test**

```typescript
// src/dns/dns-proxy.test.ts
import { describe, it, expect, afterEach } from "vitest";
import { createDnsProxy } from "./dns-proxy.js";
import dns2 from "dns2";

describe("dns-proxy", () => {
  let server: ReturnType<typeof createDnsProxy> | null = null;

  afterEach(async () => {
    if (server) {
      await server.stop();
      server = null;
    }
  });

  it("resolves intercepted hostnames to server IP", async () => {
    server = createDnsProxy({
      port: 15353,
      serverIp: "192.168.1.100",
      interceptedHosts: ["device.pulse.kodak.com"],
      upstream: "8.8.8.8",
    });
    await server.start();

    const resolver = new dns2.default({ dns: "127.0.0.1", port: 15353 });
    const result = await resolver.resolveA("device.pulse.kodak.com");
    expect(result.answers[0].address).toBe("192.168.1.100");
  });

  it("forwards non-intercepted queries upstream", async () => {
    server = createDnsProxy({
      port: 15354,
      serverIp: "192.168.1.100",
      interceptedHosts: ["device.pulse.kodak.com"],
      upstream: "8.8.8.8",
    });
    await server.start();

    const resolver = new dns2.default({ dns: "127.0.0.1", port: 15354 });
    const result = await resolver.resolveA("example.com");
    // Should get a real IP, not our server IP
    expect(result.answers.length).toBeGreaterThan(0);
    expect(result.answers[0].address).not.toBe("192.168.1.100");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/dns/dns-proxy.test.ts
```
Expected: FAIL — module not found

- [ ] **Step 3: Write DNS proxy implementation**

```typescript
// src/dns/dns-proxy.ts
import dns2 from "dns2";
import { logger } from "../logger.js";

const { Packet } = dns2;

interface DnsProxyOptions {
  port: number;
  serverIp: string;
  interceptedHosts: string[];
  upstream: string;
}

export function createDnsProxy(options: DnsProxyOptions) {
  const { port, serverIp, interceptedHosts, upstream } = options;
  const interceptedSet = new Set(interceptedHosts.map((h) => h.toLowerCase()));

  const server = dns2.createServer({
    udp: true,
    handle: async (request, send) => {
      const response = Packet.createResponseFromRequest(request);
      const question = request.questions[0];

      if (!question) {
        send(response);
        return;
      }

      const name = question.name.toLowerCase();

      if (interceptedSet.has(name) && question.type === Packet.TYPE.A) {
        logger.debug("DNS intercepted", { hostname: name, ip: serverIp });
        response.answers.push({
          name: question.name,
          type: Packet.TYPE.A,
          class: Packet.CLASS.IN,
          ttl: 60,
          address: serverIp,
        });
        send(response);
        return;
      }

      // Forward to upstream
      try {
        const resolver = new dns2.default({ dns: upstream });
        const result = await resolver.resolveA(question.name);
        response.answers = result.answers;
        send(response);
      } catch (err) {
        logger.warn("DNS upstream failed", { hostname: name, error: String(err) });
        // Return SERVFAIL
        response.header.rcode = 2;
        send(response);
      }
    },
  });

  let running = false;

  return {
    start: () =>
      new Promise<void>((resolve) => {
        server.listen({ udp: port });
        server.on("listening", () => {
          running = true;
          logger.info("DNS proxy started", { port });
          resolve();
        });
      }),
    stop: () =>
      new Promise<void>((resolve) => {
        if (!running) {
          resolve();
          return;
        }
        server.close(() => {
          running = false;
          logger.info("DNS proxy stopped");
          resolve();
        });
      }),
    isRunning: () => running,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/dns/dns-proxy.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/dns/
git commit -m "feat: add DNS proxy with hostname interception"
```

---

## Chunk 3: Kodak Pulse API

### Task 7: XML Helpers

**Files:**
- Create: `src/kodak-api/xml.ts`

- [ ] **Step 1: Write XML helpers**

Utility functions for building the exact XML structures the frame expects.

```typescript
// src/kodak-api/xml.ts
import { Builder, parseStringPromise } from "xml2js";

const builder = new Builder({
  xmldec: { version: "1.0", encoding: "UTF-8" },
  renderOpts: { pretty: true },
});

export function buildXml(rootName: string, obj: Record<string, unknown>): string {
  return builder.buildObject({ [rootName]: obj });
}

export async function parseXml<T = Record<string, unknown>>(xml: string): Promise<T> {
  const result = await parseStringPromise(xml, {
    explicitArray: false,
    trim: true,
  });
  return result as T;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/kodak-api/xml.ts
git commit -m "feat: add XML build/parse helpers for Kodak protocol"
```

---

### Task 8: DeviceToken Middleware

**Files:**
- Create: `src/kodak-api/device-token.ts`

- [ ] **Step 1: Write DeviceToken middleware**

```typescript
// src/kodak-api/device-token.ts
import type { Request, Response, NextFunction } from "express";
import { getDb } from "../db/database.js";
import { logger } from "../logger.js";

/**
 * Middleware that validates the DeviceToken header against known device sessions.
 * Returns HTTP 424 (Failed Dependency) if the token is missing or unknown.
 */
export function requireDeviceToken(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers["devicetoken"] as string | undefined;

  if (!token) {
    logger.warn("Missing DeviceToken header", { path: req.path });
    res.status(424).send("");
    return;
  }

  const db = getDb();
  const device = db
    .prepare("SELECT id, deviceID FROM devices WHERE id = ?")
    .get(token);

  if (!device) {
    logger.warn("Unknown DeviceToken", { token, path: req.path });
    res.status(424).send("");
    return;
  }

  // Update lastSeen
  db.prepare("UPDATE devices SET lastSeen = ? WHERE id = ?").run(
    new Date().toISOString(),
    token
  );

  // Attach device info to request for downstream handlers
  (req as any).device = device;
  next();
}
```

- [ ] **Step 2: Commit**

```bash
git add src/kodak-api/device-token.ts
git commit -m "feat: add DeviceToken validation middleware"
```

---

### Task 9: Activation Endpoint

**Files:**
- Create: `src/kodak-api/activate.ts`

- [ ] **Step 1: Write activation handler**

The frame sends a POST to `/DeviceRest/activate`. We respond with HTTP 412 and the activation response XML. We generate a unique device ID (used as the auth token later) and store the device in the database.

```typescript
// src/kodak-api/activate.ts
import type { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db/database.js";
import { buildXml, parseXml } from "./xml.js";
import { logger } from "../logger.js";
import { ensureDefaultAlbum } from "../photos/import.js";

export async function handleActivate(req: Request, res: Response): Promise<void> {
  try {
    const body = await parseXml<any>(req.body);
    const info = body.activationInfo;
    const deviceID = info?.deviceID ?? "unknown";

    logger.info("Device activation request", { deviceID });

    const db = getDb();

    // Check if device already exists
    let existing = db
      .prepare("SELECT id FROM devices WHERE deviceID = ?")
      .get(deviceID) as { id: string } | undefined;

    const id = existing?.id ?? uuidv4();

    if (!existing) {
      db.prepare(
        "INSERT INTO devices (id, deviceID, name, activationDate) VALUES (?, ?, ?, ?)"
      ).run(id, deviceID, "Kodak Pulse", new Date().toISOString());

      // Create default settings for this device
      db.prepare("INSERT INTO settings (deviceId) VALUES (?)").run(id);

      // Assign default album to new device
      const defaultAlbumId = ensureDefaultAlbum();
      db.prepare("INSERT OR IGNORE INTO device_albums (deviceId, albumId) VALUES (?, ?)").run(id, defaultAlbumId);

      logger.info("New device registered", { deviceID, id });
    }

    const xml = buildXml("activationResponseInfo", {
      deviceActivationID: id,
      deviceAuthorizationURL:
        "https://device.pulse.kodak.com/DeviceRestV10/Authorize",
      deviceProfileList: {
        admins: {
          profile: {
            id: uuidv4(),
            name: "Admin",
            emailAddress: "admin@kodak-pulse.local",
          },
        },
      },
    });

    res.status(412).type("application/xml").send(xml);
  } catch (err) {
    logger.error("Activation failed", { error: String(err) });
    res.status(400).type("application/xml").send(buildXml("error", { message: "Bad request" }));
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/kodak-api/activate.ts
git commit -m "feat: add device activation endpoint"
```

---

### Task 10: Authorization Endpoint

**Files:**
- Create: `src/kodak-api/authorize.ts`

- [ ] **Step 1: Write authorization handler**

```typescript
// src/kodak-api/authorize.ts
import type { Request, Response } from "express";
import { getDb } from "../db/database.js";
import { buildXml, parseXml } from "./xml.js";
import { logger } from "../logger.js";
import type { Config } from "../config.js";

export function createAuthorizeHandler(config: Config) {
  return async function handleAuthorize(req: Request, res: Response): Promise<void> {
    try {
      const body = await parseXml<any>(req.body);
      const info = body.authorizationInfo;
      const deviceID = info?.deviceID ?? "unknown";
      const activationID = info?.deviceActivationID;

      const db = getDb();
      const device = db
        .prepare("SELECT id, deviceID FROM devices WHERE deviceID = ? AND id = ?")
        .get(deviceID, activationID) as { id: string; deviceID: string } | undefined;

      if (!device) {
        logger.warn("Authorization failed — unknown device", { deviceID, activationID });
        res.status(400).send("");
        return;
      }

      // Store storage info
      const storage = info?.deviceStorage;
      if (storage) {
        db.prepare("UPDATE devices SET storageInfo = ?, lastSeen = ? WHERE id = ?").run(
          JSON.stringify(storage),
          new Date().toISOString(),
          device.id
        );
      }

      const now = Date.now();
      const xml = buildXml("authorizationResponseInfo", {
        authorizationToken: device.id,
        apiBaseURL: "http://device.pulse.kodak.com/DeviceRestV10",
        status: {
          overallStatus: String(now),
          collectionStatus: String(now),
          settingsStatus: String(now),
          pollingPeriod: String(config.pollingPeriod),
        },
        deviceProfileList: {
          admins: {
            profile: {
              id: device.id,
              name: "Admin",
              emailAddress: "admin@kodak-pulse.local",
            },
          },
        },
      });

      logger.info("Device authorized", { deviceID });
      res.status(200).type("application/xml").send(xml);
    } catch (err) {
      logger.error("Authorization failed", { error: String(err) });
      res.status(400).send("");
    }
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/kodak-api/authorize.ts
git commit -m "feat: add device authorization endpoint"
```

---

### Task 11: Status, Settings, Collection, Entity, Profile, Firmware Endpoints

**Files:**
- Create: `src/kodak-api/status.ts`
- Create: `src/kodak-api/settings.ts`
- Create: `src/kodak-api/collection.ts`
- Create: `src/kodak-api/entity.ts`
- Create: `src/kodak-api/profile.ts`
- Create: `src/kodak-api/firmware.ts`

- [ ] **Step 1: Write status handler**

```typescript
// src/kodak-api/status.ts
import type { Request, Response } from "express";
import { getDb } from "../db/database.js";
import { buildXml } from "./xml.js";
import type { Config } from "../config.js";

// In-memory timestamp tracking for collection changes
let lastCollectionChange = Date.now();

export function notifyCollectionChange(): void {
  lastCollectionChange = Date.now();
}

export function createStatusHandler(config: Config) {
  return function handleStatus(req: Request, res: Response): void {
    const timestamp = parseInt(req.params.timestamp, 10);
    const now = Date.now();

    const xml = buildXml("status", {
      overallStatus: String(now),
      collectionStatus: String(lastCollectionChange),
      settingsStatus: String(now),
      pollingPeriod: String(config.pollingPeriod),
    });

    if (lastCollectionChange > timestamp) {
      // Collection has changed since the frame last checked
      res.status(425).type("application/xml").send(xml);
    } else {
      res.status(200).type("application/xml").send(xml);
    }
  };
}
```

- [ ] **Step 2: Write settings handler**

```typescript
// src/kodak-api/settings.ts
import type { Request, Response } from "express";
import { getDb } from "../db/database.js";
import { buildXml } from "./xml.js";

export function handleSettings(req: Request, res: Response): void {
  const device = (req as any).device;
  const db = getDb();

  const settings = db
    .prepare("SELECT * FROM settings WHERE deviceId = ?")
    .get(device.id) as any;

  const deviceRow = db
    .prepare("SELECT name FROM devices WHERE id = ?")
    .get(device.id) as any;

  const xml = buildXml("deviceSettings", {
    name: deviceRow?.name ?? "Kodak Pulse",
    slideShowProperties: {
      duration: String(settings?.slideshowDuration ?? 10),
      transition: settings?.transitionType ?? "FADE",
    },
    displayProperties: {
      displayMode: settings?.displayMode ?? "ONEUP",
      showPictureInfo: "false",
      renderMode: "FILL",
    },
    autoPowerProperties: {
      autoPowerEnabled: "false",
      wakeOnContent: "false",
    },
    defaultCollectionOrder: "NAME",
    respondToLocalControls: "true",
    language: settings?.language ?? "en-us",
    timeZoneOffset: settings?.timezone ?? "0:00:00+0:00",
    managePictureStorage: "false",
    logLevel: "OFF",
    enableNotification: "true",
    modificationDate: new Date().toISOString(),
    modificationTime: String(Date.now()),
  });

  res.status(200).type("application/xml").send(xml);
}
```

- [ ] **Step 3: Write collection handler**

```typescript
// src/kodak-api/collection.ts
import type { Request, Response } from "express";
import { getDb } from "../db/database.js";
import { buildXml } from "./xml.js";

export function handleCollection(req: Request, res: Response): void {
  const device = (req as any).device;
  const db = getDb();

  // Get all photos assigned to this device via its albums
  const photos = db
    .prepare(
      `SELECT p.id, p.filename, p.dateTaken, p.importedAt, ap.sortOrder, a.sortOrder AS albumSortOrder
       FROM photos p
       JOIN album_photos ap ON ap.photoId = p.id
       JOIN albums a ON a.id = ap.albumId
       JOIN device_albums da ON da.albumId = ap.albumId
       WHERE da.deviceId = ?
       ORDER BY a.sortOrder ASC, ap.sortOrder ASC`
    )
    .all(device.id) as any[];

  const now = new Date().toISOString();
  const nowMs = String(Date.now());

  const contents =
    photos.length > 0
      ? {
          pictureSpec: photos.map((p: any) => ({
            id: p.id,
            modificationDate: p.importedAt ?? now,
            modificationTime: nowMs,
          })),
        }
      : {};

  const xml = buildXml("collection", {
    story: {
      id: device.id + "-collection",
      title: "Photos",
      displayDate: now,
      modificationDate: now,
      modificationTime: nowMs,
      authorProfileID: device.id,
      source: "EMAIL",
      contents,
    },
  });

  res.status(200).type("application/xml").send(xml);
}
```

- [ ] **Step 4: Write entity handler**

```typescript
// src/kodak-api/entity.ts
import type { Request, Response } from "express";
import { getDb } from "../db/database.js";
import { buildXml } from "./xml.js";
import { getServerIp } from "../config.js";
import type { Config } from "../config.js";
import { notifyCollectionChange } from "./status.js";

export function createEntityHandler(config: Config) {
  return function handleEntity(req: Request, res: Response): void {
    const { entityID } = req.params;
    const db = getDb();

    if (req.method === "DELETE") {
      // Remove from all album_photos (does not delete the photo itself)
      db.prepare("DELETE FROM album_photos WHERE photoId = ?").run(entityID);
      notifyCollectionChange();
      res.status(200).send("");
      return;
    }

    const photo = db
      .prepare("SELECT * FROM photos WHERE id = ?")
      .get(entityID) as any;

    if (!photo) {
      res.status(404).send("");
      return;
    }

    const serverIp = getServerIp();
    const fileURL = `http://${serverIp}:${config.ports.http}/photos/${photo.id}.jpg`;

    const xml = buildXml("picture", {
      id: photo.id,
      title: photo.filename,
      captureDate: photo.dateTaken ?? photo.importedAt,
      modificationDate: photo.importedAt,
      modificationTime: String(Date.now()),
      fileURL,
    });

    res.status(200).type("application/xml").send(xml);
  };
}
```

- [ ] **Step 5: Write profile handler**

```typescript
// src/kodak-api/profile.ts
import type { Request, Response } from "express";
import { buildXml } from "./xml.js";

export function handleProfile(req: Request, res: Response): void {
  const { profileID } = req.params;

  const xml = buildXml("profile", {
    id: profileID,
    name: "Admin",
    emailAddress: "admin@kodak-pulse.local",
  });

  res.status(200).type("application/xml").send(xml);
}
```

- [ ] **Step 6: Write firmware update blocker**

```typescript
// src/kodak-api/firmware.ts
import type { Request, Response } from "express";
import { logger } from "../logger.js";

/**
 * Intercepts firmware update checks from the frame (www.kodak.com/go/update*).
 * Returns a response indicating no update is available.
 * This prevents the frame from downloading newer firmware that might
 * enforce certificate validation and break our server.
 */
export function handleFirmwareCheck(req: Request, res: Response): void {
  logger.info("Firmware update check blocked", { url: req.url });
  // Return 404 — the frame interprets this as "no update available"
  res.status(404).send("");
}
```

- [ ] **Step 7: Commit**

```bash
git add src/kodak-api/status.ts src/kodak-api/settings.ts src/kodak-api/collection.ts src/kodak-api/entity.ts src/kodak-api/profile.ts src/kodak-api/firmware.ts
git commit -m "feat: add all Kodak API endpoint handlers"
```

---

### Task 12: Kodak API Router & Tests

**Files:**
- Create: `src/kodak-api/router.ts`
- Test: `src/kodak-api/kodak-api.test.ts`

- [ ] **Step 1: Write the Kodak API router**

```typescript
// src/kodak-api/router.ts
import { Router, raw } from "express";
import { handleActivate } from "./activate.js";
import { createAuthorizeHandler } from "./authorize.js";
import { createStatusHandler } from "./status.js";
import { handleSettings } from "./settings.js";
import { handleCollection } from "./collection.js";
import { createEntityHandler } from "./entity.js";
import { handleProfile } from "./profile.js";
import { handleFirmwareCheck } from "./firmware.js";
import { requireDeviceToken } from "./device-token.js";
import type { Config } from "../config.js";

export function createKodakRouter(config: Config): Router {
  const router = Router();

  // Parse raw XML bodies
  router.use(raw({ type: "*/*", limit: "1mb" }));

  // Middleware to convert raw buffer to string for XML parsing
  router.use((req, _res, next) => {
    if (Buffer.isBuffer(req.body)) {
      req.body = req.body.toString("utf-8");
    }
    next();
  });

  // Step 1: Activation (no auth required)
  router.post("/DeviceRest/activate", handleActivate);

  // Step 2: Authorization (no auth required)
  router.post("/DeviceRestV10/Authorize", createAuthorizeHandler(config));

  // Step 3: Authenticated operations
  router.get("/DeviceRestV10/status/:timestamp", requireDeviceToken, createStatusHandler(config));
  router.get("/DeviceRestV10/settings", requireDeviceToken, handleSettings);
  router.get("/DeviceRestV10/collection", requireDeviceToken, handleCollection);
  router.get("/DeviceRestV10/entity/:entityID", requireDeviceToken, createEntityHandler(config));
  router.delete("/DeviceRestV10/entity/:entityID", requireDeviceToken, createEntityHandler(config));
  router.get("/DeviceRestV10/profile/:profileID", requireDeviceToken, handleProfile);

  // Firmware update blocking (intercepts www.kodak.com/go/update*)
  router.get("/go/update*", handleFirmwareCheck);

  return router;
}
```

- [ ] **Step 2: Write integration tests**

```typescript
// src/kodak-api/kodak-api.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import { createKodakRouter } from "./router.js";
import { initDatabase, closeDb, getDb } from "../db/database.js";
import { initLogger } from "../logger.js";
import { existsSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const TEST_DATA_DIR = join(process.cwd(), "data-test-kodak");

const testConfig = {
  ports: { dns: 5353, http: 8080, https: 8443, webUi: 3000 },
  dns: { upstream: "8.8.8.8", interceptedHosts: [] },
  watchedFolder: join(TEST_DATA_DIR, "watch"),
  dataDir: TEST_DATA_DIR,
  logLevel: "error" as const,
  jwt: { expiryHours: 24 },
  pollingPeriod: 30,
};

let app: express.Express;
let server: any;
const PORT = 18080;

describe("kodak-api", () => {
  beforeAll(() => {
    mkdirSync(TEST_DATA_DIR, { recursive: true });
    initLogger("error", TEST_DATA_DIR);
    initDatabase(TEST_DATA_DIR);

    app = express();
    app.use(createKodakRouter(testConfig));
    server = app.listen(PORT);
  });

  afterAll(() => {
    server?.close();
    closeDb();
    if (existsSync(TEST_DATA_DIR)) {
      rmSync(TEST_DATA_DIR, { recursive: true });
    }
  });

  it("activates a device and returns 412", async () => {
    const xml = `<?xml version="1.0"?>
      <activationInfo>
        <deviceID>TESTDEVICE001</deviceID>
        <apiVersion>1.0</apiVersion>
        <apiKey>ba538605-038e-b8ee-02c4-6925cad67189</apiKey>
        <activationCode>TEST123</activationCode>
      </activationInfo>`;

    const res = await fetch(`http://127.0.0.1:${PORT}/DeviceRest/activate`, {
      method: "POST",
      body: xml,
      headers: { "Content-Type": "application/xml" },
    });

    expect(res.status).toBe(412);
    const body = await res.text();
    expect(body).toContain("activationResponseInfo");
    expect(body).toContain("deviceActivationID");
  });

  it("authorizes a device and returns auth token", async () => {
    // First activate to get device ID
    const db = getDb();
    const device = db
      .prepare("SELECT id, deviceID FROM devices WHERE deviceID = ?")
      .get("TESTDEVICE001") as any;

    const xml = `<?xml version="1.0"?>
      <authorizationInfo>
        <deviceID>${device.deviceID}</deviceID>
        <deviceActivationID>${device.id}</deviceActivationID>
        <deviceStorage>
          <bytesAvailable>400000000</bytesAvailable>
          <bytesTotal>450000000</bytesTotal>
          <picturesAvailable>4500</picturesAvailable>
          <picturesTotal>4500</picturesTotal>
        </deviceStorage>
      </authorizationInfo>`;

    const res = await fetch(`http://127.0.0.1:${PORT}/DeviceRestV10/Authorize`, {
      method: "POST",
      body: xml,
      headers: { "Content-Type": "application/xml" },
    });

    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("authorizationToken");
    expect(body).toContain(device.id);
  });

  it("returns 424 for missing DeviceToken", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT}/DeviceRestV10/settings`);
    expect(res.status).toBe(424);
  });

  it("returns settings with valid DeviceToken", async () => {
    const db = getDb();
    const device = db
      .prepare("SELECT id FROM devices WHERE deviceID = ?")
      .get("TESTDEVICE001") as any;

    const res = await fetch(`http://127.0.0.1:${PORT}/DeviceRestV10/settings`, {
      headers: { DeviceToken: device.id },
    });

    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("deviceSettings");
    expect(body).toContain("FADE");
  });

  it("returns empty collection for new device", async () => {
    const db = getDb();
    const device = db
      .prepare("SELECT id FROM devices WHERE deviceID = ?")
      .get("TESTDEVICE001") as any;

    const res = await fetch(`http://127.0.0.1:${PORT}/DeviceRestV10/collection`, {
      headers: { DeviceToken: device.id },
    });

    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("collection");
  });

  it("blocks firmware update checks", async () => {
    const res = await fetch(
      `http://127.0.0.1:${PORT}/go/update?v=2010.02.23&m=W1030&s=KCMLP012345678`
    );
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run src/kodak-api/kodak-api.test.ts
```
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/kodak-api/router.ts src/kodak-api/kodak-api.test.ts
git commit -m "feat: add Kodak API router with integration tests"
```

---

## Chunk 4: Photo Management

### Task 13: Photo Resize Module

**Files:**
- Create: `src/photos/resize.ts`
- Test: `src/photos/photos.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/photos/photos.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resizeForDisplay } from "./resize.js";
import sharp from "sharp";
import { join } from "node:path";
import { mkdirSync, existsSync, rmSync } from "node:fs";

const TEST_OUTPUT_DIR = join(process.cwd(), "data-test-photos");

describe("resizeForDisplay", () => {
  beforeEach(() => {
    mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_OUTPUT_DIR)) {
      rmSync(TEST_OUTPUT_DIR, { recursive: true });
    }
  });

  it("resizes a wide image to 800x600 by cropping", async () => {
    // Create a test 1600x900 (16:9) image
    const inputBuffer = await sharp({
      create: { width: 1600, height: 900, channels: 3, background: { r: 255, g: 0, b: 0 } },
    }).jpeg().toBuffer();

    const outputPath = join(TEST_OUTPUT_DIR, "wide.jpg");
    await resizeForDisplay(inputBuffer, outputPath);

    const metadata = await sharp(outputPath).metadata();
    expect(metadata.width).toBe(800);
    expect(metadata.height).toBe(600);
  });

  it("resizes a tall image to fit within 800x600 with letterboxing", async () => {
    // Create a test 600x1200 (1:2) portrait image
    const inputBuffer = await sharp({
      create: { width: 600, height: 1200, channels: 3, background: { r: 0, g: 255, b: 0 } },
    }).jpeg().toBuffer();

    const outputPath = join(TEST_OUTPUT_DIR, "tall.jpg");
    await resizeForDisplay(inputBuffer, outputPath);

    const metadata = await sharp(outputPath).metadata();
    expect(metadata.width).toBe(800);
    expect(metadata.height).toBe(600);
  });

  it("resizes a 4:3 image to exactly 800x600", async () => {
    const inputBuffer = await sharp({
      create: { width: 2400, height: 1800, channels: 3, background: { r: 0, g: 0, b: 255 } },
    }).jpeg().toBuffer();

    const outputPath = join(TEST_OUTPUT_DIR, "exact.jpg");
    await resizeForDisplay(inputBuffer, outputPath);

    const metadata = await sharp(outputPath).metadata();
    expect(metadata.width).toBe(800);
    expect(metadata.height).toBe(600);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/photos/photos.test.ts
```
Expected: FAIL — module not found

- [ ] **Step 3: Write resize implementation**

```typescript
// src/photos/resize.ts
import sharp from "sharp";

const TARGET_WIDTH = 800;
const TARGET_HEIGHT = 600;
const TARGET_RATIO = TARGET_WIDTH / TARGET_HEIGHT; // 4:3 = 1.333

/**
 * Resizes/crops a photo for the Kodak Pulse frame display (800x600).
 *
 * - Images wider than 4:3: crop to 4:3 center, then resize to 800x600
 * - Images taller than 4:3: resize to fit height, then composite onto black 800x600 canvas (letterbox)
 * - Images at exactly 4:3: simple resize to 800x600
 */
export async function resizeForDisplay(
  input: Buffer | string,
  outputPath: string,
  cropGravity: string = "center"
): Promise<void> {
  const image = sharp(input);
  const metadata = await image.metadata();
  const width = metadata.width!;
  const height = metadata.height!;
  const ratio = width / height;

  if (Math.abs(ratio - TARGET_RATIO) < 0.01) {
    // Already ~4:3, just resize
    await sharp(input)
      .resize(TARGET_WIDTH, TARGET_HEIGHT)
      .jpeg({ quality: 90 })
      .toFile(outputPath);
  } else if (ratio > TARGET_RATIO) {
    // Wider than 4:3 — crop width, then resize
    await sharp(input)
      .resize(TARGET_WIDTH, TARGET_HEIGHT, {
        fit: "cover",
        position: cropGravity,
      })
      .jpeg({ quality: 90 })
      .toFile(outputPath);
  } else {
    // Taller than 4:3 — letterbox
    const resized = await sharp(input)
      .resize({
        width: TARGET_WIDTH,
        height: TARGET_HEIGHT,
        fit: "contain",
        background: { r: 0, g: 0, b: 0 },
      })
      .jpeg({ quality: 90 })
      .toFile(outputPath);
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/photos/photos.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/photos/resize.ts src/photos/photos.test.ts
git commit -m "feat: add photo resize/crop for 800x600 display"
```

---

### Task 14: Photo Import Pipeline

**Files:**
- Create: `src/photos/import.ts`

- [ ] **Step 1: Write import pipeline**

```typescript
// src/photos/import.ts
import { v4 as uuidv4 } from "uuid";
import { copyFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import sharp from "sharp";
import exifReader from "exif-reader";
import { getDb } from "../db/database.js";
import { resizeForDisplay } from "./resize.js";
import { logger } from "../logger.js";
import { notifyCollectionChange } from "../kodak-api/status.js";

const DEFAULT_ALBUM_NAME = "All Photos";

export interface ImportResult {
  id: string;
  filename: string;
  success: boolean;
  error?: string;
}

/**
 * Ensures a default album exists and is assigned to all devices.
 * Returns the default album ID.
 */
export function ensureDefaultAlbum(): string {
  const db = getDb();

  let album = db
    .prepare("SELECT id FROM albums WHERE name = ?")
    .get(DEFAULT_ALBUM_NAME) as { id: string } | undefined;

  if (!album) {
    const id = uuidv4();
    db.prepare(
      "INSERT INTO albums (id, name, sortOrder, createdAt) VALUES (?, ?, 0, ?)"
    ).run(id, DEFAULT_ALBUM_NAME, new Date().toISOString());
    album = { id };

    // Assign to all existing devices
    const devices = db.prepare("SELECT id FROM devices").all() as { id: string }[];
    const insert = db.prepare("INSERT OR IGNORE INTO device_albums (deviceId, albumId) VALUES (?, ?)");
    for (const device of devices) {
      insert.run(device.id, id);
    }
  }

  return album.id;
}

/**
 * Extract date taken from EXIF data. Returns ISO string or null.
 */
function extractDateTaken(exifBuffer: Buffer | undefined): string | null {
  if (!exifBuffer) return null;
  try {
    const parsed = exifReader(exifBuffer);
    const dateOriginal = parsed?.Photo?.DateTimeOriginal ?? parsed?.Image?.DateTime;
    if (dateOriginal instanceof Date) {
      return dateOriginal.toISOString();
    }
    return null;
  } catch {
    return null;
  }
}

export async function importPhoto(
  sourcePath: string,
  filename: string,
  dataDir: string
): Promise<ImportResult> {
  const id = uuidv4();
  const ext = extname(filename).toLowerCase() || ".jpg";
  const originalPath = join(dataDir, "photos", "originals", `${id}${ext}`);
  const displayPath = join(dataDir, "photos", "display", `${id}.jpg`);

  try {
    // Copy original
    copyFileSync(sourcePath, originalPath);
    const stats = statSync(originalPath);

    // Resize for display
    await resizeForDisplay(originalPath, displayPath);

    // Extract metadata and EXIF
    const metadata = await sharp(originalPath).metadata();
    const dateTaken = extractDateTaken(metadata.exif);

    // Store in database
    const db = getDb();
    db.prepare(
      `INSERT INTO photos (id, filename, originalPath, displayPath, width, height, dateTaken, importedAt, fileSize)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      filename,
      originalPath,
      displayPath,
      metadata.width ?? 0,
      metadata.height ?? 0,
      dateTaken,
      new Date().toISOString(),
      stats.size
    );

    // Add to default album
    const defaultAlbumId = ensureDefaultAlbum();
    const maxSort = db
      .prepare("SELECT MAX(sortOrder) as max FROM album_photos WHERE albumId = ?")
      .get(defaultAlbumId) as any;
    const sortOrder = (maxSort?.max ?? -1) + 1;
    db.prepare(
      "INSERT OR IGNORE INTO album_photos (albumId, photoId, sortOrder) VALUES (?, ?, ?)"
    ).run(defaultAlbumId, id, sortOrder);

    notifyCollectionChange();
    logger.info("Photo imported", { id, filename, dateTaken });

    return { id, filename, success: true };
  } catch (err) {
    logger.warn("Photo import failed", { filename, error: String(err) });
    return { id, filename, success: false, error: String(err) };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/photos/import.ts
git commit -m "feat: add photo import pipeline with resize and metadata"
```

---

### Task 15: Watched Folder

**Files:**
- Create: `src/photos/watcher.ts`

- [ ] **Step 1: Write watcher module**

```typescript
// src/photos/watcher.ts
import chokidar from "chokidar";
import { basename, extname, join } from "node:path";
import { renameSync } from "node:fs";
import { importPhoto } from "./import.js";
import { logger } from "../logger.js";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".heic"]);

let watcher: chokidar.FSWatcher | null = null;

export function startWatcher(watchDir: string, dataDir: string): void {
  const importedDir = join(watchDir, "imported");

  watcher = chokidar.watch(watchDir, {
    ignored: [/(^|[/\\])\../, importedDir],
    persistent: true,
    depth: 0,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 500,
    },
  });

  watcher.on("add", async (filePath) => {
    const ext = extname(filePath).toLowerCase();
    if (!IMAGE_EXTENSIONS.has(ext)) {
      logger.debug("Watcher ignoring non-image file", { file: filePath });
      return;
    }

    const filename = basename(filePath);
    logger.info("Watcher detected new file", { filename });

    const result = await importPhoto(filePath, filename, dataDir);

    if (result.success) {
      // Move to imported directory
      const dest = join(importedDir, filename);
      try {
        renameSync(filePath, dest);
        logger.info("Moved imported file", { from: filePath, to: dest });
      } catch (err) {
        logger.warn("Failed to move imported file", { file: filePath, error: String(err) });
      }
    }
  });

  logger.info("Folder watcher started", { watchDir });
}

export function stopWatcher(): void {
  if (watcher) {
    watcher.close();
    watcher = null;
    logger.info("Folder watcher stopped");
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/photos/watcher.ts
git commit -m "feat: add watched folder auto-import with chokidar"
```

---

## Chunk 5: Web UI Backend

### Task 16: Auth Middleware & Rate Limiting

**Files:**
- Create: `src/web/auth-middleware.ts`
- Create: `src/web/rate-limit.ts`

- [ ] **Step 1: Write JWT auth middleware**

```typescript
// src/web/auth-middleware.ts
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
```

- [ ] **Step 2: Write rate limiter**

```typescript
// src/web/rate-limit.ts
import type { Request, Response, NextFunction } from "express";

const attempts = new Map<string, { count: number; resetAt: number }>();

/**
 * Rate limits login attempts to maxAttempts per windowMs per IP.
 */
export function loginRateLimit(maxAttempts = 5, windowMs = 60000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const now = Date.now();

    const entry = attempts.get(ip);
    if (entry && now < entry.resetAt) {
      if (entry.count >= maxAttempts) {
        res.status(429).json({ error: "Too many login attempts. Try again later." });
        return;
      }
      entry.count++;
    } else {
      attempts.set(ip, { count: 1, resetAt: now + windowMs });
    }

    next();
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/web/auth-middleware.ts src/web/rate-limit.ts
git commit -m "feat: add JWT auth middleware and login rate limiting"
```

---

### Task 17: Web API Routes

**Files:**
- Create: `src/web/routes/setup.ts`
- Create: `src/web/routes/auth.ts`
- Create: `src/web/routes/photos.ts`
- Create: `src/web/routes/albums.ts`
- Create: `src/web/routes/devices.ts`
- Create: `src/web/routes/frame-settings.ts`
- Create: `src/web/routes/users.ts`
- Create: `src/web/routes/server-settings.ts`
- Create: `src/web/routes/health.ts`

- [ ] **Step 1: Write setup route**

```typescript
// src/web/routes/setup.ts
import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import { getDb } from "../../db/database.js";

const router = Router();

// GET /api/setup/status — check if setup is complete
router.get("/status", (_req, res) => {
  const db = getDb();
  const user = db.prepare("SELECT id FROM users LIMIT 1").get();
  res.json({ setupComplete: !!user });
});

// POST /api/setup — create admin account (only works if no users exist)
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
  db.prepare(
    "INSERT INTO users (id, username, passwordHash, role, createdAt) VALUES (?, ?, ?, ?, ?)"
  ).run(id, username, hash, "admin", new Date().toISOString());

  res.json({ success: true });
});

export default router;
```

- [ ] **Step 2: Write auth route**

```typescript
// src/web/routes/auth.ts
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
    const user = db
      .prepare("SELECT id, username, passwordHash, role FROM users WHERE username = ?")
      .get(username) as any;

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      getJwtSecret(),
      { expiresIn: `${config.jwt.expiryHours}h` }
    );

    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  });

  return router;
}
```

- [ ] **Step 3: Write photos route**

```typescript
// src/web/routes/photos.ts
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

  // GET /api/photos — list all photos
  router.get("/", (_req, res) => {
    const db = getDb();
    const photos = db
      .prepare("SELECT id, filename, displayPath, width, height, dateTaken, importedAt, fileSize FROM photos ORDER BY importedAt DESC")
      .all();
    res.json(photos);
  });

  // POST /api/photos — upload photos
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
      // Clean up temp file
      try { unlinkSync(file.path); } catch {}
    }

    res.json({ results });
  });

  // DELETE /api/photos/:id — delete a photo
  router.delete("/:id", (req, res) => {
    const db = getDb();
    const photo = db.prepare("SELECT id, originalPath, displayPath FROM photos WHERE id = ?").get(req.params.id) as any;
    if (!photo) {
      res.status(404).json({ error: "Photo not found" });
      return;
    }

    // Remove from albums first (CASCADE should handle this, but be explicit)
    db.prepare("DELETE FROM album_photos WHERE photoId = ?").run(photo.id);
    db.prepare("DELETE FROM photos WHERE id = ?").run(photo.id);

    // Delete files
    try { unlinkSync(photo.originalPath); } catch {}
    try { unlinkSync(photo.displayPath); } catch {}

    res.json({ success: true });
  });

  return router;
}
```

- [ ] **Step 4: Write albums route**

```typescript
// src/web/routes/albums.ts
import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../../db/database.js";
import { requireAuth } from "../auth-middleware.js";
import { notifyCollectionChange } from "../../kodak-api/status.js";

const router = Router();
router.use(requireAuth);

// GET /api/albums — list all albums
router.get("/", (_req, res) => {
  const db = getDb();
  const albums = db.prepare("SELECT * FROM albums ORDER BY sortOrder ASC").all();
  res.json(albums);
});

// POST /api/albums — create album
router.post("/", (req, res) => {
  const { name } = req.body;
  if (!name) {
    res.status(400).json({ error: "Name required" });
    return;
  }

  const db = getDb();
  const id = uuidv4();
  const maxSort = db.prepare("SELECT MAX(sortOrder) as max FROM albums").get() as any;
  const sortOrder = (maxSort?.max ?? -1) + 1;

  db.prepare("INSERT INTO albums (id, name, sortOrder, createdAt) VALUES (?, ?, ?, ?)").run(
    id, name, sortOrder, new Date().toISOString()
  );

  res.json({ id, name, sortOrder });
});

// PUT /api/albums/:id — update album
router.put("/:id", (req, res) => {
  const { name, sortOrder } = req.body;
  const db = getDb();

  if (name !== undefined) {
    db.prepare("UPDATE albums SET name = ? WHERE id = ?").run(name, req.params.id);
  }
  if (sortOrder !== undefined) {
    db.prepare("UPDATE albums SET sortOrder = ? WHERE id = ?").run(sortOrder, req.params.id);
  }

  res.json({ success: true });
});

// DELETE /api/albums/:id
router.delete("/:id", (req, res) => {
  const db = getDb();
  db.prepare("DELETE FROM albums WHERE id = ?").run(req.params.id);
  notifyCollectionChange();
  res.json({ success: true });
});

// POST /api/albums/:id/photos — add photos to album
router.post("/:id/photos", (req, res) => {
  const { photoIds } = req.body;
  if (!Array.isArray(photoIds)) {
    res.status(400).json({ error: "photoIds array required" });
    return;
  }

  const db = getDb();
  const maxSort = db
    .prepare("SELECT MAX(sortOrder) as max FROM album_photos WHERE albumId = ?")
    .get(req.params.id) as any;
  let sortOrder = (maxSort?.max ?? -1) + 1;

  const insert = db.prepare(
    "INSERT OR IGNORE INTO album_photos (albumId, photoId, sortOrder) VALUES (?, ?, ?)"
  );

  for (const photoId of photoIds) {
    insert.run(req.params.id, photoId, sortOrder++);
  }

  notifyCollectionChange();
  res.json({ success: true });
});

// DELETE /api/albums/:albumId/photos/:photoId
router.delete("/:albumId/photos/:photoId", (req, res) => {
  const db = getDb();
  db.prepare("DELETE FROM album_photos WHERE albumId = ? AND photoId = ?").run(
    req.params.albumId, req.params.photoId
  );
  notifyCollectionChange();
  res.json({ success: true });
});

// PUT /api/albums/:id/photo-order — reorder photos
router.put("/:id/photo-order", (req, res) => {
  const { photoIds } = req.body;
  if (!Array.isArray(photoIds)) {
    res.status(400).json({ error: "photoIds array required" });
    return;
  }

  const db = getDb();
  const update = db.prepare(
    "UPDATE album_photos SET sortOrder = ? WHERE albumId = ? AND photoId = ?"
  );

  db.transaction(() => {
    photoIds.forEach((photoId: string, index: number) => {
      update.run(index, req.params.id, photoId);
    });
  })();

  notifyCollectionChange();
  res.json({ success: true });
});

export default router;
```

- [ ] **Step 5: Write devices route**

```typescript
// src/web/routes/devices.ts
import { Router } from "express";
import { getDb } from "../../db/database.js";
import { requireAuth } from "../auth-middleware.js";
import { notifyCollectionChange } from "../../kodak-api/status.js";

const router = Router();
router.use(requireAuth);

// GET /api/devices — list all devices
router.get("/", (_req, res) => {
  const db = getDb();
  const devices = db.prepare("SELECT * FROM devices ORDER BY activationDate DESC").all();
  // Parse storageInfo JSON
  const parsed = (devices as any[]).map((d) => ({
    ...d,
    storageInfo: d.storageInfo ? JSON.parse(d.storageInfo) : null,
  }));
  res.json(parsed);
});

// PUT /api/devices/:id — update device name
router.put("/:id", (req, res) => {
  const { name } = req.body;
  const db = getDb();
  db.prepare("UPDATE devices SET name = ? WHERE id = ?").run(name, req.params.id);
  res.json({ success: true });
});

// GET /api/devices/:id/albums — get albums assigned to device
router.get("/:id/albums", (req, res) => {
  const db = getDb();
  const albums = db
    .prepare(
      `SELECT a.* FROM albums a
       JOIN device_albums da ON da.albumId = a.id
       WHERE da.deviceId = ?
       ORDER BY a.sortOrder ASC`
    )
    .all(req.params.id);
  res.json(albums);
});

// PUT /api/devices/:id/albums — assign albums to device
router.put("/:id/albums", (req, res) => {
  const { albumIds } = req.body;
  if (!Array.isArray(albumIds)) {
    res.status(400).json({ error: "albumIds array required" });
    return;
  }

  const db = getDb();
  db.transaction(() => {
    db.prepare("DELETE FROM device_albums WHERE deviceId = ?").run(req.params.id);
    const insert = db.prepare("INSERT INTO device_albums (deviceId, albumId) VALUES (?, ?)");
    for (const albumId of albumIds) {
      insert.run(req.params.id, albumId);
    }
  })();

  notifyCollectionChange();
  res.json({ success: true });
});

export default router;
```

- [ ] **Step 6: Write frame-settings route**

```typescript
// src/web/routes/frame-settings.ts
import { Router } from "express";
import { getDb } from "../../db/database.js";
import { requireAuth } from "../auth-middleware.js";

const router = Router();
router.use(requireAuth);

// GET /api/devices/:id/settings
router.get("/:id/settings", (req, res) => {
  const db = getDb();
  const settings = db
    .prepare("SELECT * FROM settings WHERE deviceId = ?")
    .get(req.params.id);

  if (!settings) {
    res.status(404).json({ error: "Device not found" });
    return;
  }

  res.json(settings);
});

// PUT /api/devices/:id/settings
router.put("/:id/settings", (req, res) => {
  const { slideshowDuration, transitionType, displayMode, brightness, timezone, language } = req.body;
  const db = getDb();

  const fields: string[] = [];
  const values: any[] = [];

  if (slideshowDuration !== undefined) { fields.push("slideshowDuration = ?"); values.push(slideshowDuration); }
  if (transitionType !== undefined) { fields.push("transitionType = ?"); values.push(transitionType); }
  if (displayMode !== undefined) { fields.push("displayMode = ?"); values.push(displayMode); }
  if (brightness !== undefined) { fields.push("brightness = ?"); values.push(brightness); }
  if (timezone !== undefined) { fields.push("timezone = ?"); values.push(timezone); }
  if (language !== undefined) { fields.push("language = ?"); values.push(language); }

  if (fields.length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  values.push(req.params.id);
  db.prepare(`UPDATE settings SET ${fields.join(", ")} WHERE deviceId = ?`).run(...values);

  res.json({ success: true });
});

export default router;
```

- [ ] **Step 7: Write users route**

```typescript
// src/web/routes/users.ts
import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import { getDb } from "../../db/database.js";
import { requireAuth, requireAdmin } from "../auth-middleware.js";

const router = Router();
router.use(requireAuth, requireAdmin);

// GET /api/users
router.get("/", (_req, res) => {
  const db = getDb();
  const users = db
    .prepare("SELECT id, username, role, createdAt FROM users ORDER BY createdAt ASC")
    .all();
  res.json(users);
});

// POST /api/users
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
  db.prepare(
    "INSERT INTO users (id, username, passwordHash, role, createdAt) VALUES (?, ?, ?, ?, ?)"
  ).run(id, username, hash, role ?? "user", new Date().toISOString());

  res.json({ id, username, role: role ?? "user" });
});

// DELETE /api/users/:id
router.delete("/:id", (req, res) => {
  const db = getDb();
  // Prevent deleting the last admin
  const admins = db.prepare("SELECT id FROM users WHERE role = 'admin'").all() as any[];
  const target = db.prepare("SELECT role FROM users WHERE id = ?").get(req.params.id) as any;

  if (target?.role === "admin" && admins.length <= 1) {
    res.status(400).json({ error: "Cannot delete the last admin user" });
    return;
  }

  db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

export default router;
```

- [ ] **Step 8: Write server-settings and health routes**

```typescript
// src/web/routes/server-settings.ts
import { Router } from "express";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { requireAuth, requireAdmin } from "../auth-middleware.js";
import type { Config } from "../../config.js";

export function createServerSettingsRouter(config: Config): Router {
  const router = Router();
  router.use(requireAuth, requireAdmin);

  // GET /api/server-settings
  router.get("/", (_req, res) => {
    const configPath = join(config.dataDir, "config.json");
    try {
      const fileConfig = JSON.parse(readFileSync(configPath, "utf-8"));
      res.json(fileConfig);
    } catch {
      res.json({});
    }
  });

  // PUT /api/server-settings
  router.put("/", (req, res) => {
    const configPath = join(config.dataDir, "config.json");
    writeFileSync(configPath, JSON.stringify(req.body, null, 2));
    res.json({ success: true, message: "Restart server to apply changes" });
  });

  return router;
}
```

```typescript
// src/web/routes/health.ts
import { Router } from "express";
import { getDb } from "../../db/database.js";

const startTime = Date.now();

// Service health checkers — registered by server.ts after services start
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

  // Registered service checks (DNS proxy, Kodak API, etc.)
  for (const [name, check] of Object.entries(serviceChecks)) {
    checks[name] = check() ? "ok" : "error";
  }

  const allOk = Object.values(checks).every((v) => v === "ok");

  res.status(allOk ? 200 : 503).json({
    status: allOk ? "healthy" : "degraded",
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks,
  });
});

export default router;
```

- [ ] **Step 9: Commit**

```bash
git add src/web/routes/
git commit -m "feat: add all web API routes (setup, auth, photos, albums, devices, users, health)"
```

---

### Task 18: Web API Router

**Files:**
- Create: `src/web/router.ts`

- [ ] **Step 1: Write web router**

```typescript
// src/web/router.ts
import { Router, json, static as serveStatic } from "express";
import cors from "cors";
import { join, resolve } from "node:path";
import { existsSync } from "node:fs";
import setupRouter from "./routes/setup.js";
import { createAuthRouter } from "./routes/auth.js";
import { createPhotosRouter } from "./routes/photos.js";
import albumsRouter from "./routes/albums.js";
import devicesRouter from "./routes/devices.js";
import frameSettingsRouter from "./routes/frame-settings.js";
import usersRouter from "./routes/users.js";
import { createServerSettingsRouter } from "./routes/server-settings.js";
import healthRouter from "./routes/health.js";
import type { Config } from "../config.js";

export function createWebRouter(config: Config): Router {
  const router = Router();

  // CORS — allow only the web UI origin
  router.use(
    cors({
      origin: `http://localhost:${config.ports.webUi}`,
      credentials: true,
    })
  );

  router.use(json());

  // Health check (no auth required)
  router.use("/health", healthRouter);

  // Setup (no auth required — guarded internally)
  router.use("/api/setup", setupRouter);

  // Auth
  router.use("/api/auth", createAuthRouter(config));

  // Protected routes
  router.use("/api/photos", createPhotosRouter(config));
  router.use("/api/albums", albumsRouter);
  router.use("/api/devices", devicesRouter);
  router.use("/api/devices", frameSettingsRouter);
  router.use("/api/users", usersRouter);
  router.use("/api/server-settings", createServerSettingsRouter(config));

  // Serve React build in production
  const webUiBuildDir = resolve(process.cwd(), "web-ui", "dist");
  if (existsSync(webUiBuildDir)) {
    router.use(serveStatic(webUiBuildDir));
    // SPA fallback — serve index.html for non-API routes
    router.get("*", (_req, res) => {
      res.sendFile(join(webUiBuildDir, "index.html"));
    });
  }

  return router;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/web/router.ts
git commit -m "feat: add web API router with CORS and SPA serving"
```

---

### Task 19: Server Entry Point

**Files:**
- Create: `src/server.ts`

- [ ] **Step 1: Write server entry point**

```typescript
// src/server.ts
import express from "express";
import https from "node:https";
import { join } from "node:path";
import { loadConfig, getServerIp } from "./config.js";
import { initLogger, logger } from "./logger.js";
import { initDatabase, closeDb } from "./db/database.js";
import { ensureSslCert } from "./ssl/cert.js";
import { createDnsProxy } from "./dns/dns-proxy.js";
import { createKodakRouter } from "./kodak-api/router.js";
import { createWebRouter } from "./web/router.js";
import { initJwtSecret } from "./web/auth-middleware.js";
import { startWatcher, stopWatcher } from "./photos/watcher.js";
import { registerServiceCheck } from "./web/routes/health.js";
import { ensureDefaultAlbum } from "./photos/import.js";

async function main() {
  const config = loadConfig();
  initLogger(config.logLevel, config.dataDir);

  logger.info("Starting Kodak Pulse Server");

  // Initialize database
  initDatabase(config.dataDir);

  // Initialize JWT secret
  initJwtSecret(config.dataDir);

  // Generate SSL cert
  const ssl = ensureSslCert(config.dataDir);

  // Ensure default album exists
  ensureDefaultAlbum();

  // Start DNS proxy
  const serverIp = getServerIp();
  const dnsProxy = createDnsProxy({
    port: config.ports.dns,
    serverIp,
    interceptedHosts: config.dns.interceptedHosts,
    upstream: config.dns.upstream,
  });
  await dnsProxy.start();

  // Kodak API server (HTTP)
  const kodakApp = express();
  kodakApp.use(createKodakRouter(config));

  // Serve display photos on the Kodak HTTP server
  kodakApp.use(
    "/photos",
    express.static(join(config.dataDir, "photos", "display"))
  );

  const httpServer = kodakApp.listen(config.ports.http, "0.0.0.0", () => {
    logger.info("Kodak API (HTTP) started", { port: config.ports.http });
  });

  // Kodak API server (HTTPS)
  const httpsServer = https.createServer(
    { key: ssl.key, cert: ssl.cert },
    kodakApp
  );
  httpsServer.listen(config.ports.https, "0.0.0.0", () => {
    logger.info("Kodak API (HTTPS) started", { port: config.ports.https });
  });

  // Web UI server
  const webApp = express();
  webApp.use(createWebRouter(config));
  const webServer = webApp.listen(config.ports.webUi, "0.0.0.0", () => {
    logger.info("Web UI started", {
      port: config.ports.webUi,
      url: `http://localhost:${config.ports.webUi}`,
    });
  });

  // Register health checks
  registerServiceCheck("dns", () => dnsProxy.isRunning());
  registerServiceCheck("kodakHttp", () => httpServer.listening);
  registerServiceCheck("kodakHttps", () => httpsServer.listening);

  // Start folder watcher
  startWatcher(config.watchedFolder, config.dataDir);

  logger.info("Kodak Pulse Server started", {
    serverIp,
    dns: config.ports.dns,
    http: config.ports.http,
    https: config.ports.https,
    webUi: config.ports.webUi,
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info("Shutting down...");
    stopWatcher();
    await dnsProxy.stop();
    httpServer.close();
    httpsServer.close();
    webServer.close();
    closeDb();
    logger.info("Shutdown complete");
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Run build and verify it compiles**

```bash
npx tsc --noEmit
```
Expected: No errors (or minor type issues to fix)

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/server.ts
git commit -m "feat: add server entry point with graceful shutdown"
```

---

## Chunk 6: Web UI Frontend

### Task 20: React/Vite Scaffolding

**Files:**
- Create: `web-ui/package.json`
- Create: `web-ui/vite.config.ts`
- Create: `web-ui/tsconfig.json`
- Create: `web-ui/index.html`
- Create: `web-ui/src/main.tsx`

- [ ] **Step 1: Initialize Vite React project**

```bash
cd /Users/jaygoldman/Dev/kodak-pulse-server
npm create vite@latest web-ui -- --template react-ts
cd web-ui
npm install
npm install react-router-dom
```

- [ ] **Step 2: Configure Vite proxy for development**

Update `web-ui/vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3000",
      "/health": "http://localhost:3000",
    },
  },
});
```

- [ ] **Step 3: Commit**

```bash
cd /Users/jaygoldman/Dev/kodak-pulse-server
git add web-ui/
git commit -m "feat: scaffold React/Vite frontend with dev proxy"
```

---

### Task 21: Retro Kodak Theme & Layout

**Files:**
- Create: `web-ui/src/theme.ts`
- Create: `web-ui/src/App.tsx`
- Create: `web-ui/src/api.ts`
- Create: `web-ui/src/components/Layout.tsx`
- Create: `web-ui/src/components/ProtectedRoute.tsx`

The retro Kodak design uses:
- **Colors:** Kodak Red (#E31837), Kodak Yellow (#FFD700), warm cream (#FFF8E7), dark brown (#3D2B1F)
- **Typography:** System serif for headings (Georgia/serif stack), monospace for data
- **Motifs:** Film-strip borders, rounded corners, warm drop shadows, photo-print-on-table grid

- [ ] **Step 1: Write theme file**

```typescript
// web-ui/src/theme.ts
export const theme = {
  colors: {
    kodakRed: "#E31837",
    kodakYellow: "#FFD700",
    kodakGold: "#DAA520",
    cream: "#FFF8E7",
    warmWhite: "#FFFDF5",
    darkBrown: "#3D2B1F",
    mediumBrown: "#6B4226",
    lightBrown: "#D4A574",
    filmBlack: "#1A1A1A",
    shadow: "rgba(61, 43, 31, 0.15)",
  },
  fonts: {
    heading: "Georgia, 'Times New Roman', serif",
    body: "'Segoe UI', system-ui, -apple-system, sans-serif",
    mono: "'SF Mono', 'Monaco', 'Cascadia Code', monospace",
  },
  radius: {
    sm: "6px",
    md: "10px",
    lg: "16px",
  },
} as const;
```

- [ ] **Step 2: Write API client**

```typescript
// web-ui/src/api.ts
const BASE = "";

function getToken(): string | null {
  return localStorage.getItem("kps_token");
}

export function setToken(token: string): void {
  localStorage.setItem("kps_token", token);
}

export function clearToken(): void {
  localStorage.removeItem("kps_token");
}

export async function api<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    clearToken();
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "Request failed");
  }

  return res.json();
}
```

- [ ] **Step 3: Write Layout component**

The Layout component provides the app shell with a retro Kodak sidebar/header and film-strip decorations. Implementation should include:
- Fixed sidebar with Kodak logo area (red/yellow gradient), navigation links
- Film-strip perforations along the top edge as a CSS border pattern
- Warm cream content area with subtle paper texture
- Navigation items: Dashboard, Photos, Albums, Frame Settings, Devices, Users (admin), Settings (admin)

- [ ] **Step 4: Write ProtectedRoute component**

```typescript
// web-ui/src/components/ProtectedRoute.tsx
import { Navigate } from "react-router-dom";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("kps_token");
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
```

- [ ] **Step 5: Write App.tsx with routing**

```typescript
// web-ui/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SetupWizard } from "./pages/SetupWizard";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Photos } from "./pages/Photos";
import { Albums } from "./pages/Albums";
import { FrameSettings } from "./pages/FrameSettings";
import { Devices } from "./pages/Devices";
import { Users } from "./pages/Users";
import { ServerSettings } from "./pages/ServerSettings";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/setup" element={<SetupWizard />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="photos" element={<Photos />} />
          <Route path="albums" element={<Albums />} />
          <Route path="frame-settings" element={<FrameSettings />} />
          <Route path="devices" element={<Devices />} />
          <Route path="users" element={<Users />} />
          <Route path="server-settings" element={<ServerSettings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 6: Commit**

```bash
cd /Users/jaygoldman/Dev/kodak-pulse-server
git add web-ui/src/
git commit -m "feat: add retro Kodak theme, routing, and app shell"
```

---

### Task 22: Setup Wizard & Login Pages

**Files:**
- Create: `web-ui/src/pages/SetupWizard.tsx`
- Create: `web-ui/src/pages/Login.tsx`

Both pages should use the retro Kodak aesthetic — centered card on a warm background, Kodak red/yellow accents, vintage feel. The setup wizard checks `/api/setup/status` on mount and redirects to login if setup is already complete.

- [ ] **Step 1: Write SetupWizard page**

Centered card with Kodak branding. Username + password fields. Calls `POST /api/setup`, then redirects to login on success.

- [ ] **Step 2: Write Login page**

Centered card matching setup wizard style. Username + password fields. Calls `POST /api/auth/login`, stores JWT via `setToken()`, redirects to dashboard.

- [ ] **Step 3: Commit**

```bash
git add web-ui/src/pages/SetupWizard.tsx web-ui/src/pages/Login.tsx
git commit -m "feat: add setup wizard and login pages with Kodak styling"
```

---

### Task 23: Dashboard Page

**Files:**
- Create: `web-ui/src/pages/Dashboard.tsx`
- Create: `web-ui/src/components/DeviceStatus.tsx`

Dashboard shows:
- Device status cards (online/offline based on lastSeen within 2x polling period, storage metrics)
- Quick stats (total photos, total albums)
- Retro Kodak styling — cards with warm shadows, film-strip decorative borders

- [ ] **Step 1: Write DeviceStatus component**

Shows device name, online/offline badge, last seen timestamp, storage bar (bytes used/total).

- [ ] **Step 2: Write Dashboard page**

Fetches from `/api/devices` and `/api/photos`. Renders device status cards and stats.

- [ ] **Step 3: Commit**

```bash
git add web-ui/src/pages/Dashboard.tsx web-ui/src/components/DeviceStatus.tsx
git commit -m "feat: add dashboard page with device status and stats"
```

---

### Task 24: Photos Page

**Files:**
- Create: `web-ui/src/pages/Photos.tsx`
- Create: `web-ui/src/components/PhotoGrid.tsx`
- Create: `web-ui/src/components/PhotoUpload.tsx`

Photos page features:
- Drag-and-drop upload zone at top (styled like a vintage photo envelope)
- Photo grid below — photos rendered like prints laid on a table (slight rotation, shadow, white border like a Polaroid)
- Bulk select mode with checkboxes
- Actions: delete selected, add selected to album
- Click photo to view details (EXIF data, crop adjustment)

- [ ] **Step 1: Write PhotoUpload component**

Drag-and-drop zone + file picker button. Uploads via `POST /api/photos` with FormData. Shows progress.

- [ ] **Step 2: Write PhotoGrid component**

Grid of photo thumbnails. Each photo has a slight random rotation (CSS transform, ±2deg), white border, warm shadow — "prints on table" effect. Checkbox overlay for bulk selection.

- [ ] **Step 3: Write Photos page**

Composes PhotoUpload + PhotoGrid. Fetches from `/api/photos`. Toolbar with bulk actions (delete, add to album dropdown).

- [ ] **Step 4: Commit**

```bash
git add web-ui/src/pages/Photos.tsx web-ui/src/components/PhotoGrid.tsx web-ui/src/components/PhotoUpload.tsx
git commit -m "feat: add photos page with upload and retro grid"
```

---

### Task 25: Albums Page

**Files:**
- Create: `web-ui/src/pages/Albums.tsx`
- Create: `web-ui/src/components/AlbumCard.tsx`

Albums page features:
- Grid of album cards (thumbnail preview from first photo, name, photo count)
- Create new album button
- Click album to view/manage its photos (reorder via drag, remove from album)
- Drag-to-reorder albums

- [ ] **Step 1: Write AlbumCard component**

Card with thumbnail, name, photo count. Retro Kodak styling — rounded corners, warm colors.

- [ ] **Step 2: Write Albums page**

Fetches from `/api/albums`. Renders album cards. Create/rename/delete modals.

- [ ] **Step 3: Commit**

```bash
git add web-ui/src/pages/Albums.tsx web-ui/src/components/AlbumCard.tsx
git commit -m "feat: add albums page with card grid"
```

---

### Task 26: Remaining Pages

**Files:**
- Create: `web-ui/src/pages/FrameSettings.tsx`
- Create: `web-ui/src/pages/Devices.tsx`
- Create: `web-ui/src/pages/Users.tsx`
- Create: `web-ui/src/pages/ServerSettings.tsx`

- [ ] **Step 1: Write FrameSettings page**

Form with fields: slideshow duration (number), transition type (dropdown: FADE, etc.), display mode (dropdown), brightness (slider), timezone, language. Fetches from / saves to `/api/devices/:id/settings`.

- [ ] **Step 2: Write Devices page**

List of connected frames. Each shows name (editable), device ID, last seen, storage info. Album assignment checkboxes.

- [ ] **Step 3: Write Users page (admin only)**

User list table. Create user form (username, password, role dropdown). Delete button (with confirmation, can't delete last admin).

- [ ] **Step 4: Write ServerSettings page (admin only)**

Form for DNS upstream, watched folder path, polling period. Fetches from / saves to `/api/server-settings`.

- [ ] **Step 5: Commit**

```bash
git add web-ui/src/pages/
git commit -m "feat: add frame settings, devices, users, and server settings pages"
```

---

### Task 27: Frontend Build Integration

- [ ] **Step 1: Verify frontend builds**

```bash
cd /Users/jaygoldman/Dev/kodak-pulse-server/web-ui && npm run build
```
Expected: Build succeeds, outputs to `web-ui/dist/`

- [ ] **Step 2: Verify full stack build**

```bash
cd /Users/jaygoldman/Dev/kodak-pulse-server && npm run build
```
Expected: Both TypeScript backend and React frontend build successfully

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```
Expected: All tests pass

- [ ] **Step 4: Commit any build fixes**

```bash
git add -A && git commit -m "fix: resolve build issues"
```
(Only if there were fixes needed)

---

## Chunk 7: Deployment

### Task 28: launchd & pfctl Setup Scripts

**Files:**
- Create: `deploy/com.kodak-pulse.server.plist`
- Create: `deploy/com.kodak-pulse.pfctl.plist`
- Create: `scripts/install.sh`
- Create: `scripts/uninstall.sh`

- [ ] **Step 1: Write launchd plist for the server**

```xml
<!-- deploy/com.kodak-pulse.server.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.kodak-pulse.server</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>__INSTALL_DIR__/dist/server.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>__INSTALL_DIR__</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>__INSTALL_DIR__/data/logs/stdout.log</string>
    <key>StandardErrorPath</key>
    <string>__INSTALL_DIR__/data/logs/stderr.log</string>
</dict>
</plist>
```

- [ ] **Step 2: Write pfctl anchor plist**

```xml
<!-- deploy/com.kodak-pulse.pfctl.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.kodak-pulse.pfctl</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/sh</string>
        <string>-c</string>
        <string>pfctl -a com.kodak-pulse -f /etc/pf.anchors/com.kodak-pulse -e 2>/dev/null; true</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
```

- [ ] **Step 3: Write install script**

```bash
#!/bin/bash
# scripts/install.sh — Install Kodak Pulse Server as a macOS service
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
NODE_PATH=$(which node)

echo "=== Kodak Pulse Server Installer ==="
echo "Project directory: $PROJECT_DIR"
echo "Node.js: $NODE_PATH"

# Detect active network interface
NET_IF=$(route -n get default 2>/dev/null | awk '/interface:/ {print $2}')
NET_IF=${NET_IF:-en0}
echo "Network interface: $NET_IF"

# Build the project
echo "Building..."
cd "$PROJECT_DIR"
npm run build

# Create data directories
mkdir -p "$PROJECT_DIR/data"/{photos/originals,photos/display,watch/imported,certs,logs}

# Install server plist
echo "Installing launchd service..."
PLIST_SRC="$PROJECT_DIR/deploy/com.kodak-pulse.server.plist"
PLIST_DEST="$HOME/Library/LaunchAgents/com.kodak-pulse.server.plist"
sed "s|__INSTALL_DIR__|$PROJECT_DIR|g" "$PLIST_SRC" | sed "s|/usr/local/bin/node|$NODE_PATH|g" > "$PLIST_DEST"

# Generate pfctl anchor file with detected interface
echo "Installing pfctl port forwarding (requires sudo)..."
sudo tee /etc/pf.anchors/com.kodak-pulse > /dev/null <<PFEOF
rdr pass on lo0 proto udp from any to any port 53 -> 127.0.0.1 port 5353
rdr pass on lo0 proto tcp from any to any port 80 -> 127.0.0.1 port 8080
rdr pass on lo0 proto tcp from any to any port 443 -> 127.0.0.1 port 8443
rdr pass on $NET_IF proto udp from any to any port 53 -> 127.0.0.1 port 5353
rdr pass on $NET_IF proto tcp from any to any port 80 -> 127.0.0.1 port 8080
rdr pass on $NET_IF proto tcp from any to any port 443 -> 127.0.0.1 port 8443
PFEOF

# Install pfctl plist
PFCTL_SRC="$PROJECT_DIR/deploy/com.kodak-pulse.pfctl.plist"
PFCTL_DEST="/Library/LaunchDaemons/com.kodak-pulse.pfctl.plist"
sudo cp "$PFCTL_SRC" "$PFCTL_DEST"
sudo chown root:wheel "$PFCTL_DEST"

# Load services
echo "Starting services..."
sudo launchctl load "$PFCTL_DEST" 2>/dev/null || true
launchctl load "$PLIST_DEST" 2>/dev/null || true

echo ""
echo "=== Installation complete! ==="
echo "Web UI: http://localhost:3000"
echo "Open the URL above to complete setup."
```

- [ ] **Step 4: Write uninstall script**

```bash
#!/bin/bash
# scripts/uninstall.sh — Remove Kodak Pulse Server services
set -e

echo "=== Kodak Pulse Server Uninstaller ==="

# Unload services
launchctl unload "$HOME/Library/LaunchAgents/com.kodak-pulse.server.plist" 2>/dev/null || true
sudo launchctl unload "/Library/LaunchDaemons/com.kodak-pulse.pfctl.plist" 2>/dev/null || true

# Remove plists
rm -f "$HOME/Library/LaunchAgents/com.kodak-pulse.server.plist"
sudo rm -f "/Library/LaunchDaemons/com.kodak-pulse.pfctl.plist"

# Remove pfctl anchor
sudo pfctl -a com.kodak-pulse -F all 2>/dev/null || true

echo "Services removed. Data directory preserved at ./data/"
echo "Delete it manually if you want to remove all data."
```

- [ ] **Step 5: Make scripts executable**

```bash
chmod +x scripts/install.sh scripts/uninstall.sh
```

- [ ] **Step 6: Commit**

```bash
git add deploy/ scripts/
git commit -m "feat: add launchd service and pfctl install/uninstall scripts"
```

---

### Task 29: Final Integration Test & Documentation

- [ ] **Step 1: Run full build**

```bash
cd /Users/jaygoldman/Dev/kodak-pulse-server
npm run build
```
Expected: Clean build

- [ ] **Step 2: Run all tests**

```bash
npx vitest run
```
Expected: All pass

- [ ] **Step 3: Start server and verify manually**

```bash
npm run dev
```
Then in another terminal:
```bash
# Check health
curl http://localhost:3000/health

# Check setup status
curl http://localhost:3000/api/setup/status

# Check firmware block
curl http://localhost:8080/go/update?v=2010.02.23

# Test activation
curl -X POST http://localhost:8080/DeviceRest/activate \
  -H "Content-Type: application/xml" \
  -d '<?xml version="1.0"?><activationInfo><deviceID>TESTDEV</deviceID><apiVersion>1.0</apiVersion><apiKey>test</apiKey><activationCode>TEST</activationCode></activationInfo>'
```

- [ ] **Step 4: Commit any final fixes**

```bash
git add -A && git commit -m "fix: final integration fixes"
```
(Only if needed)

- [ ] **Step 5: Final commit**

```bash
git add -A && git commit -m "feat: Kodak Pulse Server v1.0 — complete implementation"
```
