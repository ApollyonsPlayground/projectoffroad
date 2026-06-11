# Version bump — action required (Noah)

**Last code bump:** 2026-06-12  
**Native version:** `1.0.8` (Android `versionCode` **9**, iOS build **9**)  
**Why:** Native rebuild — push notifications, status bar, geolocation, local notifications, location permissions.

## You update on the website

1. **`src/lib/devUpdates.ts`**
   - Bump `DEV_UPDATES_VERSION` (e.g. `'2026-06-12'`)
   - Add a new entry at the top of `DEV_UPDATES` with release notes for this build
2. **Deploy web** to Vercel (GitLab push) after editing release notes
3. Optional: mention version `1.0.8` in the release title or callout

## Already updated in code (agent)

- `app-version.json`
- `android/app/build.gradle` (via `npm run version:sync`)
- `package.json` version

## Native rebuild (after web deploy)

```powershell
npm install
npm run build
npm run version:sync
npm run android:sync
# Android Studio → signed AAB
```

**Mac (iOS):**

```bash
npm run ios:sync
npm run ios:sync-version
npm run ios:entitlements
npm run ios:camera
npm run ios:location
npm run ios:open
# Xcode → Archive → TestFlight
```

Delete or archive this file after you have updated the site and shipped both stores.
