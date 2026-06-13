# MacinCloud native release (iOS)

Use this checklist on your **remote Mac** (MacinCloud + Cursor) for a full Capacitor plugin sync and TestFlight upload.

## Before you start

- Latest code pushed to **GitLab** and **Vercel deployed** (native app loads JS from `https://socaloffroaders.com/`)
- Apple Developer account access
- Bundle ID: `com.socaloffroaders.app`

## 1. Clone and install

```bash
git clone <your-gitlab-repo-url> ~/projectoffroad
cd ~/projectoffroad
git pull
npm install
```

## 2. Generate or sync iOS project

```bash
npx cap add ios          # only first time (if ios/ folder missing)
npx cap sync ios
```

## 3. Verify all plugins

```bash
npm run ios:verify-plugins
```

Must show OK for: Camera, Geolocation, Push, LocalNotifications, StatusBar, App, Browser, Haptics, Preferences, Info.plist keys, `aps-environment`.

If anything fails:

```bash
npm run ios:camera
npm run ios:location
npm run ios:push-entitlements
npm run ios:entitlements
npx cap sync ios
npm run ios:verify-plugins
```

## 4. Version sync

```bash
npm run version:sync
npm run ios:sync-version
```

Confirm build number in Xcode matches `app-version.json` (`iosBuildNumber`).

## 5. Xcode capabilities

```bash
npx cap open ios
```

Open **`ios/App/App.xcworkspace`** (not `.xcodeproj`).

Target **App** → **Signing & Capabilities**:

- **Push Notifications** (click + Capability if missing)
- **Sign in with Apple** (should exist after `ios:entitlements`)

Confirm **Automatically manage signing** and your team are selected.

## 6. Archive and upload

1. Select **Any iOS Device (arm64)**
2. Product → **Clean Build Folder**
3. Product → **Archive**
4. Distribute → **App Store Connect** → Upload
5. App Store Connect → TestFlight → wait for processing → install on iPhone

## 7. Commit `ios/` to GitLab

After verify passes and archive succeeds:

```bash
git add ios/
git commit -m "Add synced iOS Capacitor project with camera, location, push plugins"
git push
```

Do **not** commit `ios/App/Pods/`, `DerivedData/`, or signing secrets.

## 8. Device QA (iPhone)

With **new TestFlight build** + **fresh web deploy**:

| Test | Steps |
|------|-------|
| Photo post | Feed → + → Add Photo/Video → Take Photo |
| Video | Record Video (≤30s) |
| Gallery | Choose from Library |
| Location | Active run → Share my location → allow GPS |
| Push | Sign in (if `NEXT_PUBLIC_PUSH_REGISTER=true`) → check Supabase `push_device_tokens` |
| Local reminder | Host/join run with reminder → notification fires |

## Push setup (optional, after stable TestFlight)

### iOS APNs

- Apple Developer → Keys → create APNs key (.p8)
- Link to Firebase if using FCM for iOS

### Android FCM

- Firebase console → add Android app `com.socaloffroaders.app`
- Download `google-services.json` → `android/app/google-services.json` on Windows build machine (never commit)

### Enable client registration

Vercel env: `NEXT_PUBLIC_PUSH_REGISTER=true` (only after no crash on TestFlight)

Server send stays off until configured: `PUSH_SEND_ENABLED=false`

## Cursor on MacinCloud

- Open the same repo in Cursor (your account is already signed in)
- Use Agent to run commands and fix `ios:verify-plugins` failures
- Never paste Apple passwords or `.p8` keys into chat or git

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| "Camera not implemented" | Old binary — upload new Archive; confirm `ios:verify-plugins` passed |
| "Camera not implemented" + new binary | Hard refresh app / reinstall; confirm Vercel deployed new JS |
| Verify script missing Podfile | Run `npx cap add ios && npx cap sync ios` |
| Archive signing error | Xcode → Accounts → download profiles; check bundle ID |
| Push registration crash | Leave `NEXT_PUBLIC_PUSH_REGISTER` off until fixed |

See also [release.md](release.md).
