# Push notifications setup

Remote push uses **Firebase Cloud Messaging (FCM)** for delivery to Android and iOS (iOS via APNs key linked in Firebase).

## Architecture

1. **App** (native, default on) — Capacitor registers device token → Supabase `push_device_tokens`. Optional: set `NEXT_PUBLIC_PUSH_REGISTER=false` on Vercel to disable registration during a bad build.
2. **Server** (`PUSH_SEND_ENABLED=true`) — Vercel cron/API calls Firebase Admin → FCM → user device

**Local run reminders** (72h / 48h / 24h before a run) use `@capacitor/local-notifications` on the device. They do **not** need `NEXT_PUBLIC_PUSH_REGISTER` or `PUSH_SEND_ENABLED`. Android “notifications working” often means these local reminders, not remote FCM push.

## Android native

- File: **`android/app/google-services.json`** (not `android/app/src/`)
- Download from Firebase Console → Project settings → Your Android app
- Rebuild AAB after placing file: `npm run android:sync` → `gradlew bundleRelease`

## iOS native

**Why Android push worked but iOS did not:** `@capacitor/push-notifications` returns an **FCM token** on Android but an **APNs token** on iOS. The server sends via **Firebase Admin**, which needs **FCM tokens on both platforms**. The app now uses `@capacitor-community/fcm` to fetch the FCM token on iOS after APNs registration.

1. Apple Developer → Keys → APNs key (`.p8`)
2. Firebase → Project settings → Cloud Messaging → upload APNs key (+ Key ID + Team ID)
3. Firebase → Project settings → **Your iOS app** → download **`GoogleService-Info.plist`**
4. Copy to **`ios/App/App/GoogleService-Info.plist`**
5. On Mac: `npm run ios:google-services-plist` (also adds plist to Xcode **Copy Bundle Resources**)
6. On Mac: `npm run ios:appdelegate-firebase` (removes duplicate `FirebaseApp.configure()` if present)
7. On Mac: `npm install` → `npx cap sync ios` (pulls in CapacitorCommunityFcm + patch)
6. On Mac: `npm run ios:push-entitlements` + Xcode → **Push Notifications** capability
7. On Mac: `npm run ios:appdelegate-push` (forwards APNs token to Capacitor)
8. `npm run ios:verify-plugins` (must show OK for FCM + GoogleService-Info.plist)
9. Archive new TestFlight build — **web/Vercel alone cannot fix iOS push**

## Vercel environment variables

| Variable | When | Value |
|----------|------|--------|
| `NEXT_PUBLIC_PUSH_REGISTER` | Opt-out only | Default **on**. Set `false` to disable token registration during a bad build. |
| `PUSH_SEND_ENABLED` | Server may send remote pushes | `true` (only after Firebase service account is set) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Server send | Full JSON from Firebase → Project settings → Service accounts → Generate new private key |

Paste the **entire** service account JSON as one line in Vercel (or use multiline if supported). Redeploy after adding.

**Do not commit** service account JSON or `google-services.json` to git.

## Verify registration

1. Install a native build with push entitlements (iOS TestFlight steps above; Android with `google-services.json`).
2. Sign in on the native app → **Settings → Enable push notifications** → allow the system prompt.
3. Supabase → `push_device_tokens` → row with your `user_id` and `platform` (`ios` or `android`).

Token registration is **on by default** — no Vercel env var unless you set `NEXT_PUBLIC_PUSH_REGISTER=false`.

**Admin push test requires a token first.** If **Admin → Send iOS push test** returns “no token”, the iPhone has not registered yet — complete step 2 on the phone, confirm the Supabase row, then retry the admin test on desktop. **Sending** the test also needs `PUSH_SEND_ENABLED=true` and `FIREBASE_SERVICE_ACCOUNT_JSON` on Vercel.

## Verify sending

1. Set `PUSH_SEND_ENABLED=true` and `FIREBASE_SERVICE_ACCOUNT_JSON` on Vercel → redeploy
2. **One-time test (iPhone):** complete registration above, confirm `push_device_tokens` has your row with `platform = ios`. On the site, open **Admin → Overview → Send iOS push test** (sends only to your own iOS token).
3. Run reminders cron or wait for scheduled run reminder window
4. Check Vercel function logs for `[push]` / `pushesSent` in cron response

## Local run reminders

On-device scheduled reminders use `@capacitor/local-notifications` — separate from FCM, no Firebase required.
