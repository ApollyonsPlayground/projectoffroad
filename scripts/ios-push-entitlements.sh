#!/usr/bin/env bash
# Ensures Push Notifications entitlement (aps-environment) for @capacitor/push-notifications.
# Run after `npx cap add ios` or `npx cap sync ios`.
# Also enable Push Notifications capability in Xcode (Signing & Capabilities).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENTITLEMENTS="$ROOT/ios/App/App/App.entitlements"

if [[ ! -d "$ROOT/ios/App" ]]; then
  echo "ios/App not found — run: npx cap add ios && npx cap sync ios" >&2
  exit 1
fi

mkdir -p "$(dirname "$ENTITLEMENTS")"

if [[ ! -f "$ENTITLEMENTS" ]]; then
  cp "$ROOT/scripts/templates/App.entitlements" "$ENTITLEMENTS" 2>/dev/null || cat > "$ENTITLEMENTS" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>com.apple.developer.applesignin</key>
	<array>
		<string>Default</string>
	</array>
	<key>aps-environment</key>
	<string>development</string>
</dict>
</plist>
EOF
  echo "Created $ENTITLEMENTS"
fi

if /usr/libexec/PlistBuddy -c "Print :aps-environment" "$ENTITLEMENTS" >/dev/null 2>&1; then
  /usr/libexec/PlistBuddy -c "Set :aps-environment development" "$ENTITLEMENTS"
  echo "Updated aps-environment to development (TestFlight/debug)"
else
  /usr/libexec/PlistBuddy -c "Add :aps-environment string development" "$ENTITLEMENTS"
  echo "Added aps-environment development"
fi

echo "OK: push entitlement in $ENTITLEMENTS"
echo "Next: Xcode → App target → Signing & Capabilities → + Push Notifications"
