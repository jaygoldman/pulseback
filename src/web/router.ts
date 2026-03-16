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
import preferencesRouter from "./routes/preferences.js";
import type { Config } from "../config.js";

export function createWebRouter(config: Config): Router {
  const router = Router();
  router.use(cors({ origin: `http://localhost:${config.ports.webUi}`, credentials: true }));
  router.use(json());

  router.use("/health", healthRouter);
  router.use("/api/preferences", preferencesRouter);
  router.use("/api/setup", setupRouter);
  router.use("/api/auth", createAuthRouter(config));
  router.use("/api/photos", createPhotosRouter(config));
  router.use("/api/albums", albumsRouter);
  router.use("/api/devices", devicesRouter);
  router.use("/api/devices", frameSettingsRouter);
  router.use("/api/users", usersRouter);
  router.use("/api/server-settings", createServerSettingsRouter(config));

  // Serve photo display images (so they work from the web UI port too)
  router.use("/photos", serveStatic(join(config.dataDir, "photos", "display")));

  // Serve React build in production
  const webUiBuildDir = resolve(process.cwd(), "web-ui", "dist");
  if (existsSync(webUiBuildDir)) {
    router.use(serveStatic(webUiBuildDir));
    router.get("{*path}", (_req, res) => {
      res.sendFile(join(webUiBuildDir, "index.html"));
    });
  }

  return router;
}
