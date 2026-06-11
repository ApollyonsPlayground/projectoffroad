#!/usr/bin/env bash
# Confirms iOS native projects include Capacitor plugins from package.json.
# Run on macOS after: npm install && npx cap sync ios
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PODFILE="$ROOT/ios/App/Podfile"
PACKAGE_SWIFT="$ROOT/ios/App/CapApp-SPM/Package.swift"

fail=0

check_file() {
  local path="$1"
  if [[ ! -f "$path" ]]; then
    echo "MISSING: $path"
    echo "  → Run: npx cap add ios && npx cap sync ios (on Mac)" >&2
    fail=1
    return
  fi
}

check_file "$PODFILE"

if [[ -f "$PODFILE" ]]; then
  for pod in CapacitorCamera CapacitorGeolocation CapacitorPushNotifications; do
    if ! grep -q "$pod" "$PODFILE"; then
      echo "MISSING in Podfile: $pod"
      echo "  → Run: npx cap sync ios && (cd ios/App && pod install)" >&2
      fail=1
    else
      echo "OK Podfile: $pod"
    fi
  done
fi

if [[ -f "$PACKAGE_SWIFT" ]]; then
  if ! grep -q "CapacitorCamera" "$PACKAGE_SWIFT"; then
    echo "MISSING in Package.swift: CapacitorCamera (SPM Capacitor 8+)"
    echo "  → Run: npx cap sync ios" >&2
    fail=1
  else
    echo "OK Package.swift: CapacitorCamera"
  fi
fi

if [[ $fail -ne 0 ]]; then
  echo ""
  echo "Fix: open ios/App/App.xcworkspace in Xcode, Product → Clean Build Folder, then Archive." >&2
  exit 1
fi

echo ""
echo "Native plugin references look present. If the app still says 'not implemented',"
echo "you are likely running an older TestFlight build — upload a new archive."
