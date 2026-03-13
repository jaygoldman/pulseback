import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import { createServer } from "node:http";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { initDatabase, closeDb } from "../db/database.js";
import { initLogger } from "../logger.js";
import { createKodakRouter } from "./router.js";
import type { Config } from "../config.js";

const TEST_DATA_DIR = join(process.cwd(), "data-test-kodak-api");

const testConfig: Config = {
  ports: { dns: 5353, http: 8080, https: 8443, webUi: 3000 },
  dns: { upstream: "8.8.8.8", interceptedHosts: [] },
  watchedFolder: join(TEST_DATA_DIR, "watch"),
  dataDir: TEST_DATA_DIR,
  logLevel: "error",
  jwt: { expiryHours: 24 },
  pollingPeriod: 30,
};

let baseUrl: string;
let httpServer: ReturnType<typeof createServer>;

// XML helper for building test request bodies
function buildTestXml(rootName: string, obj: Record<string, string>): string {
  const inner = Object.entries(obj)
    .map(([k, v]) => `<${k}>${v}</${k}>`)
    .join("\n  ");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<${rootName}>\n  ${inner}\n</${rootName}>`;
}

beforeAll(async () => {
  // Set up test data directory
  if (existsSync(TEST_DATA_DIR)) {
    rmSync(TEST_DATA_DIR, { recursive: true });
  }
  mkdirSync(TEST_DATA_DIR, { recursive: true });
  mkdirSync(join(TEST_DATA_DIR, "logs"), { recursive: true });
  mkdirSync(join(TEST_DATA_DIR, "watch"), { recursive: true });

  // Initialize logger and database
  initLogger("error", TEST_DATA_DIR);
  initDatabase(TEST_DATA_DIR);

  // Create Express app with Kodak router
  const app = express();
  app.use("/", createKodakRouter(testConfig));

  // Start server on random port
  await new Promise<void>((resolve) => {
    httpServer = createServer(app);
    httpServer.listen(0, "127.0.0.1", () => {
      const addr = httpServer.address() as { port: number };
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => {
    httpServer.close(() => resolve());
  });
  closeDb();
  if (existsSync(TEST_DATA_DIR)) {
    rmSync(TEST_DATA_DIR, { recursive: true });
  }
});

describe("Kodak API Router", () => {
  let deviceActivationID: string;
  let authorizationToken: string;

  it("POST /DeviceRest/activate with XML body → HTTP 412 with activationResponseInfo and deviceActivationID", async () => {
    const body = buildTestXml("activationInfo", {
      deviceID: "TEST-DEVICE-001",
    });

    const res = await fetch(`${baseUrl}/DeviceRest/activate`, {
      method: "POST",
      headers: { "Content-Type": "application/xml" },
      body,
    });

    expect(res.status).toBe(412);
    const text = await res.text();
    expect(text).toContain("activationResponseInfo");
    expect(text).toContain("deviceActivationID");

    // Extract deviceActivationID for subsequent tests
    const match = text.match(/<deviceActivationID>([^<]+)<\/deviceActivationID>/);
    expect(match).not.toBeNull();
    deviceActivationID = match![1];
  });

  it("POST /DeviceRestV10/Authorize with correct device ID and activation ID → HTTP 200 with authorizationToken", async () => {
    expect(deviceActivationID).toBeDefined();

    const body = buildTestXml("authorizationInfo", {
      deviceID: "TEST-DEVICE-001",
      deviceActivationID,
    });

    const res = await fetch(`${baseUrl}/DeviceRestV10/Authorize`, {
      method: "POST",
      headers: { "Content-Type": "application/xml" },
      body,
    });

    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("authorizationToken");

    // Extract token for subsequent tests
    const match = text.match(/<authorizationToken>([^<]+)<\/authorizationToken>/);
    expect(match).not.toBeNull();
    authorizationToken = match![1];
  });

  it("GET /DeviceRestV10/settings without DeviceToken header → HTTP 424", async () => {
    const res = await fetch(`${baseUrl}/DeviceRestV10/settings`);
    expect(res.status).toBe(424);
  });

  it("GET /DeviceRestV10/settings with valid DeviceToken → HTTP 200 with deviceSettings and FADE", async () => {
    expect(authorizationToken).toBeDefined();

    const res = await fetch(`${baseUrl}/DeviceRestV10/settings`, {
      headers: { DeviceToken: authorizationToken },
    });

    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("deviceSettings");
    expect(text).toContain("FADE");
  });

  it("GET /DeviceRestV10/collection with valid DeviceToken → HTTP 200 with collection", async () => {
    expect(authorizationToken).toBeDefined();

    const res = await fetch(`${baseUrl}/DeviceRestV10/collection`, {
      headers: { DeviceToken: authorizationToken },
    });

    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("collection");
  });

  it("GET /go/update?v=2010.02.23&m=W1030 → HTTP 404", async () => {
    const res = await fetch(`${baseUrl}/go/update?v=2010.02.23&m=W1030`);
    expect(res.status).toBe(404);
  });
});
