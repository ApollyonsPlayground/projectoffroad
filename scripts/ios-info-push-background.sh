#!/usr/bin/env bash
# Ensures UIBackgroundModes includes remote-notification (required for push on iOS).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLIST="$ROOT/ios/App/App/Info.plist"

if [[ ! -f "$PLIST" ]]; then
  echo "Info.plist not found — run: npx cap sync ios" >&2
  exit 1
fi

if /usr/libexec/PlistBuddy -c "Print :UIBackgroundModes" "$PLIST" 2>/dev/null | grep -qx "remote-notification"; then
  echo "OK Info.plist: UIBackgroundModes remote-notification"
  exit 0
fi

if /usr/libexec/PlistBuddy -c "Print :UIBackgroundModes" "$PLIST" >/dev/null 2>&1; then
  /usr/libexec/PlistBuddy -c "Add :UIBackgroundModes: string remote-notification" "$PLIST"
else
  /usr/libexec/PlistBuddy -c "Add :UIBackgroundModes array" "$PLIST"
  /usr/libexec/PlistBuddy -c "Add :UIBackgroundModes:0 string remote-notification" "$PLIST"
fi

echo "Added UIBackgroundModes → remote-notification to Info.plist"
