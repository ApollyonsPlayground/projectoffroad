# MacinCloud native release (iOS TestFlight)

Use this checklist on your **MacinCloud Mac** (with Cursor) for a full Capacitor sync and TestFlight upload.

**Current target:** version **1.3**, build **14** (see `app-version.json`).

## How this app ships

| Layer | What updates it |
|-------|------------------|
| **Web UI / API** | GitLab → Vercel (`https://socaloffroaders.com/`) — most fixes are web-only |
| **Native shell** | TestFlight / Play — only when `ios/**`, `android/**`, or Capacitor plugins change |

The iOS app is a **remote WebView** — it loads JS from production. **Deploy Vercel before testing** new web features on TestFlight.

## Before you start (Windows)

On your PC, push latest code so MacinCloud can pull it:

```powershell
cd c:\dev\projectoffroad
git status
git push gitlab main
```

Confirm Vercel deployed. Bundle ID: **`com.socaloffroaders.app`**.

**Already configured (no redo unless broken):**

- Vercel: `NEXT_PUBLIC_PUSH_REGISTER`, `PUSH_SEND_ENABLED`, Firebase service account (Android push works)
- Supabase Apple sign-in + secret rotation
- Android `google-services.json` at `android/app/google-services.json`

**This build fixes on iPhone:**

- Remote **push token registration** (AppDelegate + push entitlements + Xcode capability)
- **Apple sign-in** (OAuth browser flow — no native Apple plugin)
- Web-side **location sharing** + **Settings → Enable push notifications** (needs Vercel deploy)

---

## 1. Clone or open repo on MacinCloud

```bash
cd ~/dev/projectoffroad
```

If that path fails, find the repo:

```bash
find ~ -maxdepth 4 -name "capacitor.config.ts" 2>/dev/null
```

Must contain `package.json` with `"name": "socaloffroadersv3"`.

```bash
git pull
npm install
```

See [macincloud-cursor-prompt.md](macincloud-cursor-prompt.md) — copy the **Agent prompt** into Cursor to run steps 2–6 automatically.

---

## 2. Sync iOS project

```bash
npx cap add ios    # only if ios/ folder missing
npx cap sync ios
```

---

## 3. Patch native iOS (required every fresh `ios/` or after plugin updates)

Run all of these from repo root:

```bash
npm run ios:oauth-url-scheme      # Google OAuth return URL
npm run ios:entitlements          # Sign in with Apple
npm run ios:push-entitlements     # aps-environment in App.entitlements
npm run ios:appdelegate-push      # Forward APNs token to Capacitor
npm run ios:appdelegate-firebase    # Remove duplicate FirebaseApp.configure()
npm run ios:google-services-plist   # Verify plist + add to Xcode Copy Bundle Resources
npm run ios:camera
npm run ios:location
npx cap sync ios
```

---

## 4. Verify plugins (must pass before Archive)

```bash
npm run ios:verify-plugins
```

Expected OK lines include: Camera, Geolocation, Push, LocalNotifications, `aps-environment`, OAuth URL scheme, **AppDelegate push hooks**.

If anything is MISSING, re-run the matching script from step 3 and verify again.

---

## 5. Version sync

```bash
npm run version:sync
npm run ios:sync-version
```

Confirm in Xcode: **MARKETING_VERSION 1.3**, **CURRENT_PROJECT_VERSION 12** (or whatever `app-version.json` shows).

---

## 6. Firebase APNs (one-time, for iOS push delivery)

Android push uses FCM + `google-services.json`. **iOS also needs APNs in Firebase:**

1. Apple Developer → **Keys** → create **APNs** key (`.p8`) — note Key ID + Team ID
2. Firebase Console → Project settings → **Cloud Messaging** → upload APNs key

Without this, the token may save but **Send iOS push test** will not deliver.

---

## 7. Xcode — capabilities and signing

```bash
npx cap open ios
```

Open **`ios/App/App.xcworkspace`** (not `.xcodeproj`).

Target **App** → **Signing & Capabilities**:

| Capability | Required |
|------------|----------|
| **Push Notifications** | Yes — click **+ Capability** if missing |
| **Sign in with Apple** | Yes — after `ios:entitlements` |

- **Automatically manage signing** + your Apple Developer team
- Bundle ID: `com.socaloffroaders.app`

---

## 8. Archive and upload TestFlight

1. Scheme: **App**, destination: **Any iOS Device (arm64)**
2. **Product → Clean Build Folder**
3. **Product → Archive**
4. **Distribute App → App Store Connect → Upload**
5. [App Store Connect](https://appstoreconnect.apple.com) → TestFlight → wait for processing
6. On iPhone: **delete old SoCal Offroaders** → install new build from TestFlight

---

## 9. Commit `ios/` to GitLab (after successful verify + archive)

```bash
git add ios/
git commit -m "Sync iOS Capacitor project for TestFlight 1.3 (12)"
git push gitlab main
```

Do **not** commit `ios/App/Pods/`, `DerivedData/`, or signing secrets.

---

## 10. Device QA on iPhone (build 12+)

Use account **awesomeflaregaming@gmail.com** for Apple sign-in tests.

| Test | Steps | Pass criteria |
|------|--------|----------------|
| Apple sign-in | Log out → Sign in with Apple | Lands in app signed in |
| Google sign-in | Sign in with Google | No “invalid address” after Continue |
| Photo | Feed → + → Take Photo | No crash |
| Location | Active run you joined → Share my location | Saves without error |
| Push register | Settings → **Enable push notifications** | iOS prompt → allow |
| Push token | — | Supabase `push_device_tokens`: `user_id` `5f62c706-e59a-416e-b4de-2d7945264f27`, `platform = ios` |
| Push delivery | Admin (PC) → Send iOS push test | Notification on iPhone |
| Club hero | Open a club with garage photos | Cover rotates through garage shots (web deploy) |

**Local run reminders** (72h/48h/24h) use on-device notifications — separate from FCM; no Mac build change needed.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `cd ~/projectoffroad` fails | Use `~/dev/projectoffroad` |
| Verify: missing Podfile | `npx cap add ios && npx cap sync ios` |
| “Camera not implemented” | New TestFlight binary + `ios:verify-plugins` passed |
| Google OAuth broken on iPhone | `npm run ios:oauth-url-scheme` → new Archive |
| Apple sign-in failed | Web OAuth flow — ensure Vercel deployed; Supabase Apple Client IDs include `com.socaloffroaders.app` |
| Allowed notifications, no iOS token | `ios:appdelegate-push` + Push capability + new Archive; check Firebase APNs key |
| Admin iOS push test: no token | Complete Settings → Enable push on iPhone first |
| Admin iOS push test: fails to send | `PUSH_SEND_ENABLED` + `FIREBASE_SERVICE_ACCOUNT_JSON` on Vercel; APNs key in Firebase |
| Location update failed | Web deploy + `npm run db:push` (unique constraint migration) — no new native build |

---

## Cursor on MacinCloud

- Sign into Cursor with your account
- Open `~/dev/projectoffroad`
- Paste the Agent prompt from **[macincloud-cursor-prompt.md](macincloud-cursor-prompt.md)**
- Never paste Apple passwords or `.p8` keys into chat

See also [release.md](release.md), [push-setup.md](push-setup.md).
