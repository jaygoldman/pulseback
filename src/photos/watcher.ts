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
      const dest = join(importedDir, filename);
      try {
        renameSync(filePath, dest);
        logger.info("Moved imported file", { from: filePath, to: dest });
      } catch (err) {
        logger.warn("Failed to move imported file", {
          file: filePath,
          error: String(err),
        });
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
