# Version bump — action required (Noah)

**Last code bump:** 2026-06-12  
**Native version:** `1.0.8` (Android `versionCode` **9**, iOS build **9**)  
**Why:** Native rebuild — push notifications, status bar, geolocation, local notifications, location permissions.

## Already updated in code (agent)

- `app-version.json`
- `android/app/build.gradle` (via `npm run version:sync`)
- `package.json` version
- `src/lib/devUpdates.ts` — version `2026-06-12`, App **1.0.8** release notes

## You still do

1. **Deploy web** to Vercel (GitLab push) so `/updates` and the What's new modal go live
2. Edit release copy in `devUpdates.ts` if you want different wording

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
