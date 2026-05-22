#!/usr/bin/env bash
# Ensures Sign in with Apple entitlement exists after `npx cap add ios`.
set -euo pipefail

ENTITLEMENTS="ios/App/App/App.entitlements"

if [[ ! -d ios/App ]]; then
  echo "ios/App not found — run: npx cap add ios" >&2
  exit 1
fi

if [[ ! -f "$ENTITLEMENTS" ]]; then
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
else
  if /usr/libexec/PlistBuddy -c "Print :com.apple.developer.applesignin" "$ENTITLEMENTS" >/dev/null 2>&1; then
    echo "Sign in with Apple entitlement already present"
  else
    /usr/libexec/PlistBuddy -c "Add :com.apple.developer.applesignin array" "$ENTITLEMENTS"
    /usr/libexec/PlistBuddy -c "Add :com.apple.developer.applesignin:0 string Default" "$ENTITLEMENTS"
    echo "Added Sign in with Apple entitlement to $ENTITLEMENTS"
  fi
fi

PBX="ios/App/App.xcodeproj/project.pbxproj"
if [[ -f "$PBX" ]] && ! grep -q "CODE_SIGN_ENTITLEMENTS = App/App.entitlements" "$PBX"; then
  echo "Note: open Xcode → Signing & Capabilities → add Sign in with Apple if the capability is missing."
fi
