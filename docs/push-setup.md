# Push notifications setup

Remote push uses **Firebase Cloud Messaging (FCM)** for delivery to Android and iOS (iOS via APNs key linked in Firebase).

## Architecture

1. **App** (`NEXT_PUBLIC_PUSH_REGISTER=true`) — Capacitor registers device token → Supabase `push_device_tokens`
2. **Server** (`PUSH_SEND_ENABLED=true`) — Vercel cron/API calls Firebase Admin → FCM → user device

## Android native

- File: **`android/app/google-services.json`** (not `android/app/src/`)
- Download from Firebase Console → Project settings → Your Android app
- Rebuild AAB after placing file: `npm run android:sync` → `gradlew bundleRelease`

## iOS native

1. Apple Developer → Keys → APNs key (`.p8`)
2. Firebase → Project settings → Cloud Messaging → upload APNs key
3. Xcode → Push Notifications capability
4. `npm run ios:push-entitlements` on Mac

## Vercel environment variables

| Variable | When | Value |
|----------|------|--------|
| `NEXT_PUBLIC_PUSH_REGISTER` | App token registration | `true` |
| `PUSH_SEND_ENABLED` | Server may send pushes | `true` (only after Firebase service account is set) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Server send | Full JSON from Firebase → Project settings → Service accounts → Generate new private key |

Paste the **entire** service account JSON as one line in Vercel (or use multiline if supported). Redeploy after adding.

**Do not commit** service account JSON or `google-services.json` to git.

## Verify registration

1. Sign in on native app, allow notifications
2. Supabase → `push_device_tokens` → row with your `user_id`

## Verify sending

1. Set `PUSH_SEND_ENABLED=true` and `FIREBASE_SERVICE_ACCOUNT_JSON` on Vercel → redeploy
2. Run reminders cron or wait for scheduled run reminder window
3. Check Vercel function logs for `[push]` / `pushesSent` in cron response

## Local run reminders

On-device scheduled reminders use `@capacitor/local-notifications` — separate from FCM, no Firebase required.
