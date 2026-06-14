# Version bump — action required (Noah)

**Last code bump:** 2026-06-15  
**Native version:** `1.3` (Android **versionCode 12**, iOS build **12**)  
**Why:** New TestFlight build on MacinCloud — iOS push registration, location constraint fix, verified Apple sign-in.

## Version lockstep (Android ↔ iOS)

| Field | Android | iOS (Mac `ios:sync-version`) |
|-------|---------|------------------------------|
| User-visible | `versionName` **1.3** | MARKETING_VERSION **1.3** |
| Store build integer | `versionCode` **12** | CURRENT_PROJECT_VERSION **12** |

`npm run version:sync` sets `iosBuildNumber` = `androidVersionCode`.

## Already updated in code

- `app-version.json`
- Run `npm run version:sync` on Windows (updates `android/app/build.gradle`)
- On Mac: `npm run ios:sync-version` after pull

## You still do

### Windows (before MacinCloud)

1. **Push to GitLab** so Mac gets latest code + docs
2. **Deploy web** to Vercel (location fix, club hero rotation, push Settings button — no native rebuild needed for those)

### MacinCloud (TestFlight)

Follow **[macincloud-native-release.md](macincloud-native-release.md)** or paste the Agent prompt from **[macincloud-cursor-prompt.md](macincloud-cursor-prompt.md)**.

1. `git pull` → `npm install` → `npx cap sync ios`
2. Run all `ios:*` scripts → `npm run ios:verify-plugins` (must pass)
3. `npm run version:sync` → `npm run ios:sync-version` (confirm build **12**)
4. Xcode → Archive → Upload TestFlight
5. On iPhone: delete old app → install build **12** → Sign in with Apple → Settings → Enable push notifications
6. Supabase `push_device_tokens`: `user_id` `5f62c706-e59a-416e-b4de-2d7945264f27` (`awesomeflaregaming@gmail.com`) should get `platform = ios`

### Android (optional, later)

New Play upload only if you want versionCode **12** on Play — not required for this TestFlight-only pass.

Delete or archive this file after TestFlight is live and verified.
