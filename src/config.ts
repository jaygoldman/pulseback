import { existsSync, mkdirSync, readFileSync } from "node:fs";
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

const DATA_DIR = process.env.KPS_DATA_DIR ?? join(process.cwd(), "data");

const DEFAULTS: Config = {
  ports: {
    dns: 5354,
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
    join(config.dataDir, "uploads-tmp"),
  ];
  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}
