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
  logger.info("Starting Pulseback");

  initDatabase(config.dataDir);
  initJwtSecret(config.dataDir);
  ensureDefaultAlbum();

  const ssl = await ensureSslCert(config.dataDir);

  const serverIp = getServerIp();
  const dnsProxy = createDnsProxy({
    port: config.ports.dns,
    serverIp,
    interceptedHosts: config.dns.interceptedHosts,
    upstream: config.dns.upstream,
  });
  await dnsProxy.start();

  const kodakApp = express();
  kodakApp.use(createKodakRouter(config));
  kodakApp.use("/photos", express.static(join(config.dataDir, "photos", "display")));

  const httpServer = kodakApp.listen(config.ports.http, "0.0.0.0", () => {
    logger.info("Kodak API (HTTP) started", { port: config.ports.http });
  });

  const httpsServer = https.createServer({ key: ssl.key, cert: ssl.cert }, kodakApp);
  httpsServer.listen(config.ports.https, "0.0.0.0", () => {
    logger.info("Kodak API (HTTPS) started", { port: config.ports.https });
  });

  const webApp = express();
  webApp.use(createWebRouter(config));
  const webServer = webApp.listen(config.ports.webUi, "0.0.0.0", () => {
    logger.info("Web UI started", { port: config.ports.webUi, url: `http://localhost:${config.ports.webUi}` });
  });

  registerServiceCheck("dns", () => dnsProxy.isRunning());
  registerServiceCheck("kodakHttp", () => httpServer.listening);
  registerServiceCheck("kodakHttps", () => httpsServer.listening);

  startWatcher(config.watchedFolder, config.dataDir);

  logger.info("Pulseback started", { serverIp, dns: config.ports.dns, http: config.ports.http, https: config.ports.https, webUi: config.ports.webUi });

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
