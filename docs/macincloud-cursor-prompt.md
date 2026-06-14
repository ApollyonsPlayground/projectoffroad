# MacinCloud Cursor — iOS TestFlight build

Open this file on the **MacinCloud Mac** in Cursor. Copy the **Agent prompt** below into chat (one message). The agent should run every command itself — you do not need to copy terminal commands by hand.

---

## Agent prompt (copy everything in the box)

```
SoCal Offroaders — MacinCloud iOS build

Repo path on this Mac is almost certainly:
  ~/dev/projectoffroad
NOT ~/projectoffroad (that path does not exist here).

Goal: fix iPhone sign-in + push, sync to app version 1.3 build 11, verify native plugins, then tell me when Xcode Archive is ready.

Do ALL of this yourself in the terminal:

1. cd ~/dev/projectoffroad
   If that fails, find the repo: ls ~/dev && ls ~ && locate projectoffroad 2>/dev/null | head -5

2. git pull && npm install

3. npx cap sync ios

4. Run these scripts (use bash if npm script missing):
   bash scripts/ios-oauth-url-scheme.sh
   bash scripts/ios-enable-apple-sign-in.sh
   bash scripts/ios-push-entitlements.sh
   bash scripts/ios-appdelegate-push.sh
   bash scripts/ios-camera-usage.sh
   bash scripts/ios-location-usage.sh

5. Sync version from app-version.json (should be 1.3 / build 11):
   node scripts/sync-app-version.mjs
   bash scripts/ios-sync-version.sh

6. Verify everything:
   bash scripts/ios-verify-capacitor-plugins.sh
   Fix any MISSING lines and re-run verify until it passes.

7. Report:
   - MARKETING_VERSION and build number from ios-sync-version output
   - Full ios:verify-plugins output
   - Any errors

Then tell me to open Xcode:
   npx cap open ios
   Open ios/App/App.xcworkspace
   Add Push Notifications capability if missing
   Clean → Archive → Upload TestFlight

Do not commit secrets. Do not git push unless I ask.

Context: Android push already works. iPhone needs OAuth URL scheme, AppDelegate push hooks, Apple sign-in entitlements, and new TestFlight binary. Supabase Apple Client ID must include com.socaloffroaders.app (already configured on web).
```

---

## If the agent says “not a git repo” or wrong folder

Try these paths in order:

```bash
cd ~/dev/projectoffroad
```

```bash
cd /Users/user950660/dev/projectoffroad
```

```bash
find ~ -maxdepth 4 -name "capacitor.config.ts" 2>/dev/null
```

Use whichever folder contains `capacitor.config.ts` and `package.json` with `"name": "socaloffroadersv3"`.

---

## Commands reference (for the agent — run from repo root)

```bash
cd ~/dev/projectoffroad
git pull
npm install
npx cap sync ios
```

```bash
bash scripts/ios-oauth-url-scheme.sh
bash scripts/ios-enable-apple-sign-in.sh
bash scripts/ios-push-entitlements.sh
bash scripts/ios-appdelegate-push.sh
bash scripts/ios-camera-usage.sh
bash scripts/ios-location-usage.sh
```

```bash
node scripts/sync-app-version.mjs
bash scripts/ios-sync-version.sh
bash scripts/ios-verify-capacitor-plugins.sh
```

Or via npm (same repo root):

```bash
npm run ios:oauth-url-scheme
npm run ios:entitlements
npm run ios:push-entitlements
npm run ios:appdelegate-push
npm run ios:camera
npm run ios:location
npm run version:sync
npm run ios:sync-version
npm run ios:verify-plugins
```

---

## Xcode (you do this manually after verify passes)

```bash
cd ~/dev/projectoffroad
npx cap open ios
```

1. Open **`ios/App/App.xcworkspace`** (not `.xcodeproj`)
2. Target **App** → **Signing & Capabilities**
   - **Push Notifications** (+ Capability if missing)
   - **Sign in with Apple** (should exist)
3. Confirm version **1.3** and build **11** (or higher)
4. Select **Any iOS Device (arm64)**
5. **Product → Clean Build Folder**
6. **Product → Archive**
7. **Distribute → App Store Connect → Upload**
8. TestFlight → install on iPhone

---

## After TestFlight installs on iPhone

1. Delete old app → install new TestFlight build
2. Sign in with **Apple**
3. Allow **notifications**
4. Supabase → `push_device_tokens` → row with `platform = ios`
5. On website (admin): **Admin → Overview → Send iOS push test**

---

## Common MacinCloud mistakes

| Symptom | Cause | Fix |
|---------|--------|-----|
| `cd ~/projectoffroad` fails | Wrong path | Use `~/dev/projectoffroad` |
| `npm install` → 1 package | Ran in home directory | `cd ~/dev/projectoffroad` first |
| Missing script `ios:oauth-url-scheme` | Old code on Mac | `git pull` in repo |
| iOS still 1.0.8 / build 10 | Never ran version sync in repo | `node scripts/sync-app-version.mjs` |
| Google “invalid address” on iPhone | No URL scheme in Info.plist | `ios-oauth-url-scheme.sh` + new Archive |
| Apple sign-in failed | Supabase or entitlements | Client ID `com.socaloffroaders.app` + `ios:entitlements` |
| Push token never registers | Missing AppDelegate hooks | `ios-appdelegate-push.sh` + Push capability |

---

## Windows first (before Mac pull)

Push latest code from your PC to GitLab so Mac gets new scripts:

```powershell
cd c:\dev\projectoffroad
git push gitlab main
```

Then on Mac: `git pull` inside `~/dev/projectoffroad`.

See also [macincloud-native-release.md](macincloud-native-release.md) and [push-setup.md](push-setup.md).
