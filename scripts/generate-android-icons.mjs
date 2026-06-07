/**
 * Generate Android launcher mipmaps from assets/socal-offroaders-icon-1024.png
 * Run: node scripts/generate-android-icons.mjs
 */
import sharp from 'sharp';
import { mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const src = path.join(root, 'assets', 'socal-offroaders-icon-1024.png');
const resRoot = path.join(root, 'android', 'app', 'src', 'main', 'res');

/** Legacy launcher + adaptive foreground densities */
const SIZES = {
  'mipmap-mdpi': { launcher: 48, foreground: 108 },
  'mipmap-hdpi': { launcher: 72, foreground: 162 },
  'mipmap-xhdpi': { launcher: 96, foreground: 216 },
  'mipmap-xxhdpi': { launcher: 144, foreground: 324 },
  'mipmap-xxxhdpi': { launcher: 192, foreground: 432 },
};

async function writePng(buffer, outPath, size) {
  await mkdir(path.dirname(outPath), { recursive: true });
  await sharp(buffer).resize(size, size, { fit: 'cover' }).png().toFile(outPath);
}

const source = await sharp(src).png().toBuffer();

for (const [folder, { launcher, foreground }] of Object.entries(SIZES)) {
  const dir = path.join(resRoot, folder);
  await writePng(source, path.join(dir, 'ic_launcher.png'), launcher);
  await writePng(source, path.join(dir, 'ic_launcher_round.png'), launcher);
  await writePng(source, path.join(dir, 'ic_launcher_foreground.png'), foreground);
}

console.log('Android launcher icons written under android/app/src/main/res/mipmap-*');
