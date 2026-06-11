#!/usr/bin/env bash
# Sync app-version.json → iOS MARKETING_VERSION + CURRENT_PROJECT_VERSION (Xcode).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLIST="$ROOT/ios/App/App/Info.plist"
PBXPROJ="$ROOT/ios/App/App.xcodeproj/project.pbxproj"
VERSION_JSON="$ROOT/app-version.json"

if [[ ! -f "$VERSION_JSON" ]]; then
  echo "Missing $VERSION_JSON" >&2
  exit 1
fi

VERSION_NAME=$(node -p "JSON.parse(require('fs').readFileSync('$VERSION_JSON','utf8')).versionName")
BUILD_NUMBER=$(node -p "JSON.parse(require('fs').readFileSync('$VERSION_JSON','utf8')).iosBuildNumber")

if [[ ! -f "$PBXPROJ" ]]; then
  echo "Xcode project not found at $PBXPROJ — run npx cap add ios && npx cap sync ios first" >&2
  exit 1
fi

# Update MARKETING_VERSION and CURRENT_PROJECT_VERSION in project.pbxproj
sed -i.bak -E "s/MARKETING_VERSION = [^;]+;/MARKETING_VERSION = ${VERSION_NAME};/g" "$PBXPROJ"
sed -i.bak -E "s/CURRENT_PROJECT_VERSION = [^;]+;/CURRENT_PROJECT_VERSION = ${BUILD_NUMBER};/g" "$PBXPROJ"
rm -f "${PBXPROJ}.bak"

if [[ -f "$PLIST" ]]; then
  /usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString ${VERSION_NAME}" "$PLIST" 2>/dev/null \
    || /usr/libexec/PlistBuddy -c "Add :CFBundleShortVersionString string ${VERSION_NAME}" "$PLIST"
  /usr/libexec/PlistBuddy -c "Set :CFBundleVersion ${BUILD_NUMBER}" "$PLIST" 2>/dev/null \
    || /usr/libexec/PlistBuddy -c "Add :CFBundleVersion string ${BUILD_NUMBER}" "$PLIST"
fi

echo "iOS: MARKETING_VERSION ${VERSION_NAME}, build ${BUILD_NUMBER}"
