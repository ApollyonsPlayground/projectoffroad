#!/usr/bin/env bash
# Registers com.socaloffroaders.app:// deep links for OAuth return (Google / Apple web flow).
# Without this, Safari shows "link doesn't exist" on Continue in the app after sign-in.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLIST="$ROOT/ios/App/App/Info.plist"
SCHEME="com.socaloffroaders.app"

if [[ ! -f "$PLIST" ]]; then
  echo "Info.plist not found at $PLIST — run: npx cap add ios && npx cap sync ios" >&2
  exit 1
fi

if /usr/libexec/PlistBuddy -c "Print :CFBundleURLTypes" "$PLIST" >/dev/null 2>&1; then
  count="$(/usr/libexec/PlistBuddy -c "Print :CFBundleURLTypes" "$PLIST" 2>/dev/null | grep -c "Dict" || true)"
  found=0
  for ((i=0; i<count; i++)); do
    if /usr/libexec/PlistBuddy -c "Print :CFBundleURLTypes:$i:CFBundleURLSchemes:0" "$PLIST" 2>/dev/null | grep -qx "$SCHEME"; then
      found=1
      break
    fi
  done
  if [[ $found -eq 1 ]]; then
    echo "OK: URL scheme $SCHEME already in Info.plist"
    exit 0
  fi
  idx="$count"
  /usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:$idx dict" "$PLIST"
else
  idx=0
  /usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes array" "$PLIST"
  /usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0 dict" "$PLIST"
fi

/usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:$idx:CFBundleURLName string $SCHEME" "$PLIST"
/usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:$idx:CFBundleURLSchemes array" "$PLIST"
/usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:$idx:CFBundleURLSchemes:0 string $SCHEME" "$PLIST"

echo "Added URL scheme $SCHEME to Info.plist (OAuth deep link)"
