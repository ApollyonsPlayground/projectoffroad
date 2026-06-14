#!/usr/bin/env bash
# Patches AppDelegate.swift so Capacitor Push Notifications receives APNs device tokens.
# Required by @capacitor/push-notifications on iOS (see plugin README).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_DELEGATE="$(find "$ROOT/ios/App" -name 'AppDelegate.swift' -print -quit 2>/dev/null || true)"

if [[ -z "$APP_DELEGATE" || ! -f "$APP_DELEGATE" ]]; then
  echo "AppDelegate.swift not found — run: npx cap add ios && npx cap sync ios" >&2
  exit 1
fi

if grep -q 'capacitorDidRegisterForRemoteNotifications' "$APP_DELEGATE"; then
  echo "OK: AppDelegate already forwards APNs tokens to Capacitor"
  exit 0
fi

python3 - <<'PY' "$APP_DELEGATE"
import pathlib
import sys

path = pathlib.Path(sys.argv[1])
text = path.read_text(encoding="utf-8")

snippet = """
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }
"""

marker = "class AppDelegate"
if marker not in text:
    print("Could not find AppDelegate class — patch manually (see docs/push-setup.md)", file=sys.stderr)
    sys.exit(1)

# Insert before the last closing brace of the class (before final `}` of file is fragile; use last `}` in class)
idx = text.rfind("\n}")
if idx == -1:
    print("Could not locate class end in AppDelegate.swift", file=sys.stderr)
    sys.exit(1)

path.write_text(text[:idx] + snippet + text[idx:], encoding="utf-8")
print(f"Patched {path} with Capacitor push notification hooks")
PY

echo "Next: npm run ios:verify-plugins"
