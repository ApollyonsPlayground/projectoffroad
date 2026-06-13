#!/usr/bin/env bash
# Confirms iOS native project includes all Capacitor plugins used by the app.
# Run on macOS after: npm install && npx cap sync ios
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PODFILE="$ROOT/ios/App/Podfile"
PACKAGE_SWIFT="$ROOT/ios/App/CapApp-SPM/Package.swift"
ENTITLEMENTS="$ROOT/ios/App/App/App.entitlements"
PLIST="$ROOT/ios/App/App/Info.plist"

fail=0

check_file() {
  local path="$1"
  local hint="$2"
  if [[ ! -f "$path" ]]; then
    echo "MISSING: $path"
    echo "  → $hint" >&2
    fail=1
    return 1
  fi
  return 0
}

echo "=== Capacitor iOS plugin verify ==="

# Podfile checks (CocoaPods layout)
PODS=(
  CapacitorCamera
  CapacitorGeolocation
  CapacitorPushNotifications
  CapacitorLocalNotifications
  CapacitorStatusBar
  CapacitorApp
  CapacitorBrowser
  CapacitorHaptics
  CapacitorPreferences
)

if check_file "$PODFILE" "Run: npx cap add ios && npx cap sync ios"; then
  for pod in "${PODS[@]}"; do
    if ! grep -q "$pod" "$PODFILE"; then
      echo "MISSING in Podfile: $pod"
      echo "  → Run: npx cap sync ios && (cd ios/App && pod install)" >&2
      fail=1
    else
      echo "OK Podfile: $pod"
    fi
  done
fi

# SPM layout (Capacitor 8+)
SPM_PLUGINS=(
  CapacitorCamera
  CapacitorGeolocation
  CapacitorPushNotifications
  CapacitorLocalNotifications
  CapacitorStatusBar
  CapacitorApp
  CapacitorBrowser
  CapacitorHaptics
  CapacitorPreferences
)

if [[ -f "$PACKAGE_SWIFT" ]]; then
  for pkg in "${SPM_PLUGINS[@]}"; do
    if ! grep -q "$pkg" "$PACKAGE_SWIFT"; then
      echo "MISSING in Package.swift: $pkg"
      echo "  → Run: npx cap sync ios" >&2
      fail=1
    else
      echo "OK Package.swift: $pkg"
    fi
  done
fi

# Apple Sign-In (Capawesome)
if [[ -f "$PODFILE" ]] && grep -q "CapawesomeCapacitorAppleSignIn\|CapacitorAppleSignIn" "$PODFILE" 2>/dev/null; then
  echo "OK Podfile: Apple Sign-In"
elif [[ -f "$PACKAGE_SWIFT" ]] && grep -q "CapacitorAppleSignIn\|AppleSignIn" "$PACKAGE_SWIFT" 2>/dev/null; then
  echo "OK Package.swift: Apple Sign-In"
else
  echo "WARN: Apple Sign-In plugin not found in Podfile/SPM (iOS sign-in may fail)"
fi

# Info.plist permission strings
if check_file "$PLIST" "Run: npx cap sync ios"; then
  for key in NSCameraUsageDescription NSPhotoLibraryUsageDescription NSMicrophoneUsageDescription NSLocationWhenInUseUsageDescription; do
    if ! /usr/libexec/PlistBuddy -c "Print :$key" "$PLIST" >/dev/null 2>&1; then
      echo "MISSING Info.plist: $key — run npm run ios:camera && npm run ios:location"
      fail=1
    else
      echo "OK Info.plist: $key"
    fi
  done
fi

# Push entitlement
if [[ -f "$ENTITLEMENTS" ]]; then
  if /usr/libexec/PlistBuddy -c "Print :aps-environment" "$ENTITLEMENTS" >/dev/null 2>&1; then
    echo "OK entitlements: aps-environment"
  else
    echo "MISSING entitlements: aps-environment — run npm run ios:push-entitlements"
    fail=1
  fi
else
  echo "MISSING: $ENTITLEMENTS — run npm run ios:push-entitlements && npm run ios:entitlements"
  fail=1
fi

if [[ $fail -ne 0 ]]; then
  echo ""
  echo "Fix failures above, then: Xcode → Clean Build Folder → Archive." >&2
  exit 1
fi

echo ""
echo "All native plugin checks passed."
echo "If the app still says 'not implemented', upload a new TestFlight/Play build."
