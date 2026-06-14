#!/usr/bin/env bash
# Adds GoogleService-Info.plist to the Xcode App target (Copy Bundle Resources).
# File on disk alone is not enough — Firebase crashes without it in the app bundle.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLIST="$ROOT/ios/App/App/GoogleService-Info.plist"
PBXPROJ="$ROOT/ios/App/App.xcodeproj/project.pbxproj"

if [[ ! -f "$PLIST" ]]; then
  echo "MISSING: $PLIST — run npm run ios:google-services-plist" >&2
  exit 1
fi

if [[ ! -f "$PBXPROJ" ]]; then
  echo "Xcode project not found at $PBXPROJ — run: npx cap add ios && npx cap sync ios" >&2
  exit 1
fi

python3 - <<'PY' "$PBXPROJ"
import re
import sys
import uuid
from pathlib import Path

pbx = Path(sys.argv[1])
text = pbx.read_text(encoding="utf-8")
name = "GoogleService-Info.plist"

if re.search(rf"{re.escape(name)} in Resources", text):
    print(f"OK: {name} already in Copy Bundle Resources")
    sys.exit(0)

if name not in text:
    file_ref_id = uuid.uuid4().hex[:24].upper()
    build_file_id = uuid.uuid4().hex[:24].upper()

    file_ref_line = (
        f"\t\t{file_ref_id} /* {name} */ = {{isa = PBXFileReference; "
        f'lastKnownFileType = text.plist.xml; path = "{name}"; sourceTree = "<group>"; }};\n'
    )
    build_file_line = (
        f"\t\t{build_file_id} /* {name} in Resources */ = {{isa = PBXBuildFile; "
        f"fileRef = {file_ref_id} /* {name} */; }};\n"
    )

    text = text.replace(
        "/* End PBXFileReference section */",
        file_ref_line + "/* End PBXFileReference section */",
    )
    text = text.replace(
        "/* End PBXBuildFile section */",
        build_file_line + "/* End PBXBuildFile section */",
    )

    # Add to App folder group (sibling of Info.plist when present).
    group_match = re.search(
        r"(\w+) /\* Info\.plist \*/,",
        text,
    )
    if group_match:
        insert_at = group_match.end()
        text = (
            text[:insert_at]
            + f"\n\t\t\t\t{file_ref_id} /* {name} */,"
            + text[insert_at:]
        )
    else:
        # Fallback: first PBXGroup with path = App
        app_group = re.search(
            r"(isa = PBXGroup;[^}]*path = App;[^}]*children = \(\n)([^)]*)",
            text,
            re.DOTALL,
        )
        if app_group:
            children = app_group.group(2)
            if name not in children:
                text = text.replace(
                    app_group.group(0),
                    app_group.group(1) + children + f"\t\t\t\t{file_ref_id} /* {name} */,\n",
                )

    # Add to Resources build phase (same phase as Assets.xcassets or Info.plist).
    resources_match = re.search(
        r"(isa = PBXResourcesBuildPhase;[^}]*files = \(\n)([^)]*)",
        text,
        re.DOTALL,
    )
    if not resources_match:
        print("Could not find PBXResourcesBuildPhase in project.pbxproj", file=sys.stderr)
        sys.exit(1)

    files_block = resources_match.group(2)
    text = text.replace(
        resources_match.group(0),
        resources_match.group(1)
        + files_block
        + f"\t\t\t\t{build_file_id} /* {name} in Resources */,\n",
    )

    pbx.write_text(text, encoding="utf-8")
    print(f"Added {name} to Xcode project (Copy Bundle Resources)")
else:
    print(f"WARN: {name} referenced in pbxproj but not in Resources — fix manually in Xcode")
    sys.exit(1)
PY

echo "Next: npm run ios:verify-plugins"
