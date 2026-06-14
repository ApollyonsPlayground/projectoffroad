#!/usr/bin/env node
/**
 * Repo-level iOS push checks (runs on Windows without a full ios/ Xcode tree).
 * Full native verify: npm run ios:verify-plugins on macOS after cap sync.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let fail = 0;

function ok(msg) {
  console.log(`OK: ${msg}`);
}
function miss(msg) {
  console.error(`MISSING: ${msg}`);
  fail = 1;
}

console.log('=== iOS push repo verify (Windows / CI) ===\n');

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (pkg.dependencies?.['@capacitor-community/fcm']) ok('@capacitor-community/fcm in package.json');
else miss('@capacitor-community/fcm — run npm install');

if (pkg.dependencies?.['@capacitor/push-notifications']) ok('@capacitor/push-notifications in package.json');
else miss('@capacitor/push-notifications');

const fcmPatch = join(root, 'patches', '@capacitor-community+fcm+8.1.0.patch');
if (existsSync(fcmPatch)) ok('FCM deferred-init patch');
else miss('patches/@capacitor-community+fcm+8.1.0.patch');

const googlePlist = join(root, 'ios', 'App', 'App', 'GoogleService-Info.plist');
if (existsSync(googlePlist)) {
  ok('GoogleService-Info.plist in repo');
  const plist = readFileSync(googlePlist, 'utf8');
  if (plist.includes('com.socaloffroaders.app')) ok('GoogleService-Info BUNDLE_ID');
  else miss('GoogleService-Info.plist BUNDLE_ID mismatch');
} else {
  miss('ios/App/App/GoogleService-Info.plist — download from Firebase');
}

const scripts = [
  'ios-appdelegate-push.sh',
  'ios-appdelegate-firebase.sh',
  'ios-google-services-plist.sh',
  'ios-google-services-xcode.sh',
  'ios-push-entitlements.sh',
  'ios-info-push-background.sh',
  'ios-verify-capacitor-plugins.sh',
];
for (const s of scripts) {
  if (existsSync(join(root, 'scripts', s))) ok(`scripts/${s}`);
  else miss(`scripts/${s}`);
}

console.log('');
if (fail) {
  console.error('Fix repo issues above. On Mac: git pull && npm install && npx cap sync ios && npm run ios:verify-plugins');
  process.exit(1);
}
console.log('Repo push prerequisites OK.');
console.log('Next on Mac: npx cap sync ios → run all ios:* scripts → npm run ios:verify-plugins → Archive.');
