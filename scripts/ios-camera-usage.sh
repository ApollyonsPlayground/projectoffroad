#!/usr/bin/env bash
# Ensures Camera / Photo Library / Microphone usage strings exist for @capacitor/camera
# (photos + video recording). Run after `npx cap add ios` or `npx cap sync ios`.
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

set_plist_string "NSCameraUsageDescription" "SoCal Offroaders uses the camera for profile photos, posts, stories, and club media."
set_plist_string "NSPhotoLibraryUsageDescription" "SoCal Offroaders needs photo library access so you can choose images and videos to share."
set_plist_string "NSPhotoLibraryAddUsageDescription" "SoCal Offroaders can save photos you capture to your library when you choose to."
set_plist_string "NSMicrophoneUsageDescription" "SoCal Offroaders uses the microphone when you record videos for posts and messages."

echo "OK: camera / gallery / microphone usage strings in $PLIST"
