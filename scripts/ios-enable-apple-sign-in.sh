#!/usr/bin/env bash
# Ensures Sign in with Apple entitlement file exists after `npx cap add ios`.
# Xcode sets CODE_SIGN_ENTITLEMENTS = App/App.entitlements when you add the capability;
# this script creates that file if it is missing.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENTITLEMENTS="$ROOT/ios/App/App/App.entitlements"
TEMPLATE="$ROOT/scripts/templates/App.entitlements"

if [[ ! -d "$ROOT/ios/App" ]]; then
  echo "ios/App not found — run: npx cap add ios" >&2
  exit 1
fi

mkdir -p "$(dirname "$ENTITLEMENTS")"

if [[ ! -f "$ENTITLEMENTS" ]]; then
  if [[ -f "$TEMPLATE" ]]; then
    cp "$TEMPLATE" "$ENTITLEMENTS"
    echo "Created $ENTITLEMENTS (from template)"
  else
    cat > "$ENTITLEMENTS" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>com.apple.developer.applesignin</key>
	<array>
		<string>Default</string>
	</array>
</dict>
</plist>
EOF
    echo "Created $ENTITLEMENTS"
  fi
else
  if /usr/libexec/PlistBuddy -c "Print :com.apple.developer.applesignin" "$ENTITLEMENTS" >/dev/null 2>&1; then
    echo "Sign in with Apple entitlement already present at $ENTITLEMENTS"
  else
    /usr/libexec/PlistBuddy -c "Add :com.apple.developer.applesignin array" "$ENTITLEMENTS"
    /usr/libexec/PlistBuddy -c "Add :com.apple.developer.applesignin:0 string Default" "$ENTITLEMENTS"
    echo "Added Sign in with Apple entitlement to $ENTITLEMENTS"
  fi
fi

if [[ ! -f "$ENTITLEMENTS" ]]; then
  echo "ERROR: entitlements file still missing at $ENTITLEMENTS" >&2
  exit 1
fi

echo "OK: $(ls -la "$ENTITLEMENTS")"
