#!/usr/bin/env bash
# Ensures location usage strings exist for @capacitor/geolocation (live map + SOS).
# Run after `npx cap add ios` or `npx cap sync ios`.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLIST="$ROOT/ios/App/App/Info.plist"

if [[ ! -f "$PLIST" ]]; then
  echo "Info.plist not found at $PLIST — run: npx cap add ios && npx cap sync ios" >&2
  exit 1
fi

set_plist_string() {
  local key="$1"
  local value="$2"
  if /usr/libexec/PlistBuddy -c "Print :$key" "$PLIST" >/dev/null 2>&1; then
    /usr/libexec/PlistBuddy -c "Set :$key $value" "$PLIST"
    echo "Updated $key"
  else
    /usr/libexec/PlistBuddy -c "Add :$key string $value" "$PLIST"
    echo "Added $key"
  fi
}

set_plist_string "NSLocationWhenInUseUsageDescription" "SoCal Offroaders uses your location when you share your position on an active run or send an SOS alert."
set_plist_string "NSLocationAlwaysAndWhenInUseUsageDescription" "SoCal Offroaders uses your location when you share your position on an active run or send an SOS alert."

echo "OK: location usage strings in $PLIST"
