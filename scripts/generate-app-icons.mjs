import sharp from "sharp";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(root, "assets", "app-logo-source.png");
const publicDir = path.join(root, "public");

function stripWhiteCorners(pixels, width, height) {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      if (r > 232 && g > 232 && b > 232) {
        pixels[i + 3] = 0;
      }
    }
  }
}

async function buildBase() {
  const input = readFileSync(sourcePath);
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixels = Buffer.from(data);
  stripWhiteCorners(pixels, info.width, info.height);
  return sharp(pixels, {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).png();
}

async function writeIcon(base, name, size) {
  await base
    .clone()
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, name));
}

async function main() {
  const base = await buildBase();
  await writeIcon(base, "logo.png", 512);
  await writeIcon(base, "icon-512.png", 512);
  await writeIcon(base, "icon-192.png", 192);
  await writeIcon(base, "apple-touch-icon.png", 180);
  await writeIcon(base, "favicon.png", 32);
  console.log("Generated logo and PWA icons in public/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
