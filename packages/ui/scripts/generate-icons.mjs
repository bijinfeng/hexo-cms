/* eslint-env node */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const svgPath = resolve(root, "assets/icons/icon.svg");
const svgBuffer = readFileSync(svgPath);

/**
 * @typedef {{ path: string; size?: number }} Output
 * @type {Output[]}
 */
const outputs = [
  // Web
  {
    path: resolve(root, "../web/public/favicon-32.png"),
    size: 32,
  },
  {
    path: resolve(root, "../web/public/apple-touch-icon.png"),
    size: 180,
  },
  {
    path: resolve(root, "../web/public/icon.svg"),
    svg: true,
  },
  // Desktop
  {
    path: resolve(root, "../desktop/build/icon.png"),
    size: 512,
  },
  {
    path: resolve(root, "../desktop/build/tray-mac.png"),
    size: 16,
  },
  {
    path: resolve(root, "../desktop/build/tray-mac@2x.png"),
    size: 32,
  },
];

for (const output of outputs) {
  mkdirSync(dirname(output.path), { recursive: true });

  if (output.svg) {
    writeFileSync(output.path, svgBuffer);
    console.log(`Copied SVG: ${output.path}`);
  } else {
    await sharp(svgBuffer)
      .resize(output.size, output.size)
      .png()
      .toFile(output.path);
    console.log(`Generated ${output.size}x${output.size}: ${output.path}`);
  }
}

console.log("Done: all icons generated.");
