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
