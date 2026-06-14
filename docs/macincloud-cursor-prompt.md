# MacinCloud Cursor — iOS TestFlight build

Open this file on the **MacinCloud Mac** in Cursor. Copy the **Agent prompt** below into chat (one message). The agent should run every command itself.

---

## Agent prompt (copy everything in the box)

```
SoCal Offroaders — MacinCloud iOS TestFlight build 1.3 (12)

Repo path on this Mac is almost certainly:
  ~/dev/projectoffroad
NOT ~/projectoffroad

Goal: sync iOS native project, verify plugins (FCM + GoogleService-Info.plist), set version 1.3 build 13, then tell me when Xcode Archive is ready.

Do ALL of this yourself in the terminal:

1. cd ~/dev/projectoffroad
   If that fails: find ~ -maxdepth 4 -name "capacitor.config.ts" 2>/dev/null

2. git pull && npm install

3. npx cap sync ios

4. Place Firebase iOS config (if missing):
   npm run ios:google-services-plist
   (Download GoogleService-Info.plist from Firebase → iOS app com.socaloffroaders.app → copy to ios/App/App/)

5. Run native patch scripts:
   npm run ios:oauth-url-scheme
   npm run ios:entitlements
   npm run ios:push-entitlements
   npm run ios:appdelegate-push
   npm run ios:camera
   npm run ios:location
   npx cap sync ios

5. Version sync (must show build 13):
   npm run version:sync
   npm run ios:sync-version

6. Verify — fix any MISSING and re-run until all OK:
   npm run ios:verify-plugins

7. Report:
   - MARKETING_VERSION and CURRENT_PROJECT_VERSION from ios:sync-version
   - Full ios:verify-plugins output
   - Any errors

Then tell me to open Xcode manually:
   npx cap open ios
   → ios/App/App.xcworkspace
   → Add Push Notifications capability if missing
   → Clean Build Folder → Archive → Upload to TestFlight

Do not commit secrets. Do not git push unless I ask.

Context:
- App loads JS from https://socaloffroaders.com/ (Vercel must be deployed for web fixes)
- Apple sign-in uses OAuth browser flow (not native Apple plugin)
- Android push uses FCM token; iOS was saving APNs token (wrong). App now uses @capacitor-community/fcm for FCM on iOS.
- iPhone needs GoogleService-Info.plist + APNs in Firebase + TestFlight build 13+
- After TestFlight: sign in as awesomeflaregaming@gmail.com → Settings → Enable push notifications
- Verify Supabase push_device_tokens has platform=ios for user 5f62c706-e59a-416e-b4de-2d7945264f27
- Firebase must have APNs .p8 key uploaded for iOS push delivery
```

---

## Quick command reference (repo root)

```bash
cd ~/dev/projectoffroad
git pull && npm install && npx cap sync ios
npm run ios:oauth-url-scheme && npm run ios:entitlements && npm run ios:push-entitlements
npm run ios:appdelegate-push && npm run ios:camera && npm run ios:location
npx cap sync ios
npm run version:sync && npm run ios:sync-version && npm run ios:verify-plugins
npx cap open ios
```

---

## Xcode (manual after verify passes)

1. **`ios/App/App.xcworkspace`**
2. Target **App** → **Signing & Capabilities** → **Push Notifications** + **Sign in with Apple**
3. Version **1.3**, build **12**
4. **Any iOS Device (arm64)** → Clean → Archive → Upload
5. TestFlight → install on iPhone (delete old app first)

---

## After TestFlight on iPhone

1. Sign in with **Apple** (`awesomeflaregaming@gmail.com`)
2. **Settings → Enable push notifications** → Allow
3. Supabase → `push_device_tokens` → `platform = ios` for your user
4. PC → **Admin → Send iOS push test**
5. Active run → **Share my location** (web deploy required)
6. Club page with garage photos → hero should rotate (web deploy)

---

## Windows before Mac session

```powershell
cd c:\dev\projectoffroad
npm run version:sync
git push gitlab main
```

Deploy Vercel, then `git pull` on Mac.

See [macincloud-native-release.md](macincloud-native-release.md) and [push-setup.md](push-setup.md).
