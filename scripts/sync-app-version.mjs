#!/usr/bin/env node
/**
 * Sync app-version.json → Android build.gradle, package.json.
 * Keeps iosBuildNumber === String(androidVersionCode) for store parity.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const versionPath = join(root, 'app-version.json');
const v = JSON.parse(readFileSync(versionPath, 'utf8'));

const { versionName, androidVersionCode, packageJsonVersion } = v;
if (!versionName || !androidVersionCode) {
  console.error('app-version.json needs versionName and androidVersionCode');
  process.exit(1);
}

const iosBuild = String(androidVersionCode);
if (v.iosBuildNumber !== iosBuild) {
  v.iosBuildNumber = iosBuild;
  writeFileSync(versionPath, `${JSON.stringify(v, null, 2)}\n`);
  console.log(`app-version.json: iosBuildNumber synced to ${iosBuild} (matches androidVersionCode)`);
}

const gradlePath = join(root, 'android', 'app', 'build.gradle');
let gradle = readFileSync(gradlePath, 'utf8');
gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${androidVersionCode}`);
gradle = gradle.replace(/versionName\s+"[^"]*"/, `versionName "${versionName}"`);
writeFileSync(gradlePath, gradle);
console.log(`Android: versionCode ${androidVersionCode}, versionName "${versionName}"`);
console.log(`iOS (on Mac): MARKETING_VERSION "${versionName}", build ${iosBuild} — run npm run ios:sync-version`);

const pkgPath = join(root, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
if (packageJsonVersion) {
  pkg.version = packageJsonVersion;
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log(`package.json: version "${packageJsonVersion}"`);
}

console.log('Done.');
