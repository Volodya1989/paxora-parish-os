#!/usr/bin/env bash
set -euo pipefail

# IOS-A2: Configure iOS app identity for Capacitor-generated project.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
IOS_DIR="$ROOT_DIR/ios/App"
PBXPROJ="$IOS_DIR/App.xcodeproj/project.pbxproj"
INFO_PLIST="$IOS_DIR/App/Info.plist"

if [[ ! -f "$PBXPROJ" || ! -f "$INFO_PLIST" ]]; then
  echo "[ios-a2] Missing iOS project files."
  echo "[ios-a2] Run: bash scripts/mobile/bootstrap-capacitor-ios.sh"
  exit 1
fi

BUNDLE_ID="${IOS_BUNDLE_ID:-com.paxora.parishcenter}"
DISPLAY_NAME="${IOS_DISPLAY_NAME:-Paxora Parish Center App}"
VERSION_NAME="${IOS_VERSION_NAME:-1.0.0}"
BUILD_NUMBER="${IOS_BUILD_NUMBER:-1}"
DEVELOPMENT_TEAM="${IOS_DEVELOPMENT_TEAM:-}"

# Update Info.plist identity fields.
/usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName $DISPLAY_NAME" "$INFO_PLIST" \
  || /usr/libexec/PlistBuddy -c "Add :CFBundleDisplayName string $DISPLAY_NAME" "$INFO_PLIST"
/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $VERSION_NAME" "$INFO_PLIST"
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $BUILD_NUMBER" "$INFO_PLIST"

# Update PRODUCT_BUNDLE_IDENTIFIER everywhere in project.
perl -0pi -e 's/PRODUCT_BUNDLE_IDENTIFIER = [^;]+;/PRODUCT_BUNDLE_IDENTIFIER = '"$BUNDLE_ID"';/g' "$PBXPROJ"

# Optional development team for automatic signing.
if [[ -n "$DEVELOPMENT_TEAM" ]]; then
  if rg -q "DEVELOPMENT_TEAM = " "$PBXPROJ"; then
    perl -0pi -e 's/DEVELOPMENT_TEAM = [A-Z0-9]+;/DEVELOPMENT_TEAM = '"$DEVELOPMENT_TEAM"';/g' "$PBXPROJ"
  else
    perl -0pi -e 's/CODE_SIGN_STYLE = Automatic;/CODE_SIGN_STYLE = Automatic;\n\t\t\t\tDEVELOPMENT_TEAM = '"$DEVELOPMENT_TEAM"';/g' "$PBXPROJ"
  fi
fi

echo "[ios-a2] Updated iOS identity settings:"
echo "  bundle id:   $BUNDLE_ID"
echo "  app name:    $DISPLAY_NAME"
echo "  version:     $VERSION_NAME"
echo "  build:       $BUILD_NUMBER"
if [[ -n "$DEVELOPMENT_TEAM" ]]; then
  echo "  team:        $DEVELOPMENT_TEAM"
else
  echo "  team:        (unchanged; set IOS_DEVELOPMENT_TEAM to configure)"
fi
