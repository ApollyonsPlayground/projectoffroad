# Version bump — action required (Noah)

**Last code bump:** 2026-06-13  
**Native version:** `1.3` (Android **versionCode 11**, iOS build **11**)  
**Why:** Play upload — FCM + push; versionCode 10 already used on Play.

## Version lockstep (Android ↔ iOS)

| Field | Android | iOS (Mac `ios:sync-version`) |
|-------|---------|------------------------------|
| User-visible | `versionName` **1.3** | MARKETING_VERSION **1.3** |
| Store build integer | `versionCode` **11** | CURRENT_PROJECT_VERSION **11** |

`npm run version:sync` auto-sets `iosBuildNumber` = `androidVersionCode`.

## Already updated in code

- `app-version.json`
- `android/app/build.gradle` (via `npm run version:sync`)
- `package.json` → `1.3.0`
- `src/lib/devUpdates.ts`

## You still do

1. **Deploy web** to Vercel (GitLab push)
2. **Signed AAB** from `android/app/build/outputs/bundle/release/app-release.aab` → Play Console (**1.3**, code **11**)
3. **MacinCloud:** `git pull` → `npm run ios:sync-version` → Archive → TestFlight (same **1.3** / build **11**)

See [push-setup.md](push-setup.md) for Vercel Firebase env vars.

Delete or archive this file after both stores are updated.
