#!/usr/bin/env bash
# Removes manual FirebaseApp.configure() from AppDelegate — @capacitor-community/fcm configures Firebase.
# Duplicate configure() causes: "Default app has already been configured."
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_DELEGATE="$(find "$ROOT/ios/App" -name 'AppDelegate.swift' -print -quit 2>/dev/null || true)"

if [[ -z "$APP_DELEGATE" || ! -f "$APP_DELEGATE" ]]; then
  echo "AppDelegate.swift not found — skip (run npx cap sync ios first)" >&2
  exit 0
fi

if ! grep -q 'FirebaseApp.configure' "$APP_DELEGATE"; then
  echo "OK: AppDelegate does not call FirebaseApp.configure (FCM plugin handles it)"
  exit 0
fi

python3 - <<'PY' "$APP_DELEGATE"
import pathlib
import re
import sys

path = pathlib.Path(sys.argv[1])
text = path.read_text(encoding="utf-8")
original = text

# Remove import FirebaseCore if only used for configure
text = re.sub(r'^\s*import FirebaseCore\s*\n', '', text, flags=re.MULTILINE)
text = re.sub(r'^\s*import Firebase\s*\n', '', text, flags=re.MULTILINE)

# Remove configure blocks (with or without nil guard)
text = re.sub(
    r'\s*if FirebaseApp\.app\(\) == nil \{\s*\n\s*FirebaseApp\.configure\(\)\s*\n\s*\}\s*\n?',
    '\n',
    text,
)
text = re.sub(r'\s*FirebaseApp\.configure\(\)\s*\n?', '\n', text)

if text == original:
    print("WARN: FirebaseApp.configure found but could not auto-remove — edit AppDelegate manually", file=sys.stderr)
    sys.exit(1)

path.write_text(text, encoding="utf-8")
print(f"Removed FirebaseApp.configure() from {path}")
PY

echo "Next: npm run ios:verify-plugins"
