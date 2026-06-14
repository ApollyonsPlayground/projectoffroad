# Version bump — action required (Noah)

**Last code bump:** 2026-06-15  
**Native version:** `2.0` (Android **versionCode 17**, iOS build **17**)  
**Why:** Major version sync — iOS push/FCM stable on TestFlight; align all stores to build 17.

## Version lockstep (Android ↔ iOS)

| Field | Android | iOS (Mac `ios:sync-version`) |
|-------|---------|------------------------------|
| User-visible | `versionName` **2.0** | MARKETING_VERSION **2.0** |
| Store build integer | `versionCode` **17** | CURRENT_PROJECT_VERSION **17** |

`npm run version:sync` sets `iosBuildNumber` = `androidVersionCode`.

## Already updated in code

- `app-version.json` → **2.0** / build **17**
- `npm run version:sync` → `android/app/build.gradle`, `package.json` **2.0.0**
- On Mac: `npm run ios:sync-version` after pull

## Remotes

| Remote | Role |
|--------|------|
| **gitlab** | Vercel deploy source of truth |
| **origin** (GitHub) | Mirror — was behind; push `main` to sync |

## You still do

### Windows

1. Confirm Vercel deployed after push
2. Optional: upload Android AAB to Play (versionCode **17**, versionName **2.0**)

### MacinCloud / GitHub Actions iOS (TestFlight)

1. `git pull` → `npm install` → `npx cap sync ios`
2. Run all `ios:*` scripts → `npm run ios:verify-plugins`
3. `npm run version:sync` → `npm run ios:sync-version` (confirm build **17**, version **2.0**)
4. Xcode → Archive → Upload TestFlight
5. iPhone: install build **17** → sign in → allow notifications when prompted

Delete or archive this file after TestFlight + Play are live at **2.0 (17)**.
