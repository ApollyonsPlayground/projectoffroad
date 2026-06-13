# Version bump — action required (Noah)

**Last code bump:** 2026-06-13  
**Native version:** `1.0.9` (Android `versionCode` **10**, iOS build **10**)  
**Why:** Native Capacitor plugins — camera/photo/video, geolocation, push registration, local notifications.

## Already updated in code (agent)

- `app-version.json`
- `android/app/build.gradle` (via `npm run version:sync`)
- `package.json` version
- `src/lib/devUpdates.ts` — version `2026-06-13`, App **1.0.9** release notes
- Native JS: `@capacitor/camera`, geolocation hardening, `PushRegistration` wired in layout
- Removed `@capacitor/action-sheet` dependency
- `scripts/ios-push-entitlements.sh`, expanded `ios:verify-plugins`

## You still do

1. **Deploy web** to Vercel (GitLab push) — required before native testing picks up new JS
2. Force-stop / refresh app on test devices after deploy

## Native rebuild (after web deploy)

### Windows — Android

```powershell
cd c:\dev\projectoffroad
npm install
npm run version:sync
npm run android:sync
cd android
.\gradlew.bat bundleRelease
```

Optional for push tokens: place `google-services.json` in `android/app/` (not in git).

### MacinCloud — iOS

See **[docs/macincloud-native-release.md](macincloud-native-release.md)** for full steps.

```bash
npm install
npx cap add ios          # only if ios/ missing
npx cap sync ios
npm run ios:verify-plugins
npm run ios:camera
npm run ios:location
npm run ios:push-entitlements
npm run ios:entitlements
npm run version:sync
npm run ios:sync-version
npx cap open ios
# Xcode: Push Notifications capability → Clean → Archive → TestFlight
# Commit ios/ to GitLab after verify passes
```

### Push registration flag (after TestFlight smoke test)

Set `NEXT_PUBLIC_PUSH_REGISTER=true` in Vercel if token registration is stable. Keep `PUSH_SEND_ENABLED=false` until FCM/APNs send is configured.

Delete or archive this file after site + both stores are updated.
