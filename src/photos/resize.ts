import sharp from "sharp";

const TARGET_WIDTH = 800;
const TARGET_HEIGHT = 600;
const TARGET_RATIO = TARGET_WIDTH / TARGET_HEIGHT;

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
    await sharp(input)
      .resize(TARGET_WIDTH, TARGET_HEIGHT)
      .jpeg({ quality: 90 })
      .toFile(outputPath);
  } else if (ratio > TARGET_RATIO) {
    // Wider than 4:3 — crop to fit
    await sharp(input)
      .resize(TARGET_WIDTH, TARGET_HEIGHT, {
        fit: "cover",
        position: cropGravity,
      })
      .jpeg({ quality: 90 })
      .toFile(outputPath);
  } else {
    // Taller than 4:3 — letterbox
    await sharp(input)
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
