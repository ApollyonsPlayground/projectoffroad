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

## Supabase: guest join (anonymous auth)

Run guest invites use Supabase **anonymous sign-in**. Local config sets `enable_anonymous_sign_ins = true` in `supabase/config.toml`.

**Production:** after applying migrations (`npm run db:push`), enable the same in Supabase Dashboard → **Authentication** → **Providers** → **Anonymous** → allow anonymous sign-ins.

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

### Version bump (required every native rebuild)

**Agent / dev:** edit `app-version.json`, then run `npm run version:sync`.

| Field | Purpose |
|-------|---------|
| `versionName` | User-visible (Play + App Store), e.g. `1.0.8` |
| `androidVersionCode` | Integer — **must** increase every Play upload |
| `iosBuildNumber` | String — **must** increase every TestFlight upload |

On Mac after sync: `npm run ios:sync-version` (updates Xcode project + Info.plist).

**Release notes:** agent updates `src/lib/devUpdates.ts` on native bumps (no sensitive info). Noah deploys web and may tweak copy. See `docs/VERSION_PENDING.md` after each bump.

## iOS TestFlight release (macOS / MacinCloud)

1. On **macOS** (from repo root):
   - `npm install`
   - `npx cap sync ios`
   - `npm run ios:verify-plugins` (must pass — checks Camera, Geolocation, Push in Podfile/SPM)
   - `npm run ios:camera` and `npm run ios:location` (Info.plist permission strings)
   - `npx cap open ios` → open **`App.xcworkspace`**, not `.xcodeproj`
2. In Xcode:
   - Product → **Clean Build Folder**, then **Archive** (required after plugin changes)
   - Distribute App → App Store Connect → Upload
3. App Store Connect → TestFlight:
   - wait for Processing to finish
   - enable Internal/External testing

## GitHub Actions note

GitHub “Re-run failed jobs” reuses the original commit SHA. To run the workflow on new pushes, use **Run workflow** and pick the branch.

