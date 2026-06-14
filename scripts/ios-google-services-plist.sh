#!/usr/bin/env bash
# Verifies GoogleService-Info.plist exists for @capacitor-community/fcm on iOS.
# Download from Firebase Console → Project settings → Your iOS app (bundle com.socaloffroaders.app).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLIST="$ROOT/ios/App/App/GoogleService-Info.plist"

if [[ ! -d "$ROOT/ios/App" ]]; then
  echo "ios/App not found — run: npx cap add ios && npx cap sync ios" >&2
  exit 1
fi

if [[ -f "$PLIST" ]]; then
  echo "OK: $PLIST"
  if /usr/libexec/PlistBuddy -c "Print :BUNDLE_ID" "$PLIST" 2>/dev/null | grep -q "com.socaloffroaders.app"; then
    echo "OK: BUNDLE_ID is com.socaloffroaders.app"
  else
    echo "WARN: GoogleService-Info.plist BUNDLE_ID may not match com.socaloffroaders.app" >&2
  fi
  if [[ -f "$ROOT/ios/App/App.xcodeproj/project.pbxproj" ]]; then
    bash "$ROOT/scripts/ios-google-services-xcode.sh"
  else
    echo "WARN: ios/App/App.xcodeproj not found — run npx cap sync ios, then npm run ios:google-services-xcode" >&2
  fi
  exit 0
fi

echo "MISSING: $PLIST" >&2
echo "" >&2
echo "iOS push needs Firebase config (FCM token), not just APNs entitlements." >&2
echo "1. Firebase Console → Project settings → Add iOS app → com.socaloffroaders.app" >&2
echo "2. Download GoogleService-Info.plist" >&2
echo "3. Copy to: ios/App/App/GoogleService-Info.plist" >&2
echo "4. In Xcode: confirm file is in App target (Copy Bundle Resources)" >&2
echo "5. npx cap sync ios → Archive new TestFlight build" >&2
exit 1
