# Release & deployment checklist (SoCal Offroaders)

This project ships as:

- **Web app** deployed by **Vercel**
- **Android** (Capacitor shell) distributed via Play (AAB/APK)
- **iOS** (Capacitor shell) distributed via TestFlight/App Store

## Source of truth (important)

**Production deploys come from GitLab** (`SoCalOffroaders-pwa`). GitHub may exist, but it is not the deploy trigger.

If you don’t see changes on `socaloffroaders.com`, confirm you pushed to the correct GitLab repo/branch that Vercel watches.

## Web-only change vs native rebuild

### Web-only (most edits in `src/**`)
Examples: pages/components, feed logic, API routes under `src/app/api/**`, policy pages (`/support`, `/terms`, etc).

- **Required**: push to GitLab branch that Vercel deploys → wait for Vercel deployment
- **Not required**: rebuild Android/iOS binaries

Why: Capacitor shells load the website from `https://socaloffroaders.com/` (remote WebView).

### Native rebuild required
Examples:
- anything in `android/**` or `ios/**`
- Capacitor plugin add/remove/update (`@capacitor/*`)
- changes to `capacitor.config.ts` that affect native (server URL, schemes)

You must rebuild and redistribute the native app (Play/TestFlight) after the web deploy.

## Deploy the website (GitLab → Vercel)

1. Push your changes to the GitLab repo branch Vercel watches.
2. In Vercel, confirm a new deployment started (Deployments tab).
3. After it’s live, hard refresh:
   - Desktop Chrome: `Ctrl+Shift+R`
   - Mobile Safari: close tab, reopen

## Android release (Windows)

From repo root:

```powershell
cd c:\dev\projectoffroad
npm install
npm run android:sync
cd android
.\gradlew.bat bundleRelease
```

Output: `android/app/build/outputs/bundle/release/*.aab`

### Version bump (Play requires increment)

Edit `android/app/build.gradle`:
- `versionCode` must increase every upload
- `versionName` is user-visible

## iOS TestFlight release (macOS / MacinCloud)

1. Open project in Xcode via:
   - `npx cap add ios` (if needed)
   - `npx cap sync ios`
   - `npx cap open ios`
2. In Xcode:
   - TARGETS → App → General → bump **Build** (must increase every upload)
   - Product → Archive
   - Distribute App → App Store Connect → Upload
3. App Store Connect → TestFlight:
   - wait for Processing to finish
   - enable Internal/External testing

## GitHub Actions note

GitHub “Re-run failed jobs” reuses the original commit SHA. To run the workflow on new pushes, use **Run workflow** and pick the branch.

