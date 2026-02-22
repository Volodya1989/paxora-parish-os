#!/usr/bin/env bash
set -euo pipefail

# IOS-A4: Configure iOS app icon + launch assets from brand-pack exports.
# This script intentionally expects pre-sized PNG exports from design/brand source-of-truth.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
IOS_ASSETS_DIR="$ROOT_DIR/ios/App/App/Assets.xcassets"
BRAND_DIR="${IOS_BRAND_ASSETS_DIR:-$ROOT_DIR/assets/brand/ios}"
APPICON_SET_DIR="$IOS_ASSETS_DIR/AppIcon.appiconset"
SPLASH_SET_DIR="$IOS_ASSETS_DIR/Splash.imageset"

if [[ ! -d "$IOS_ASSETS_DIR" ]]; then
  echo "[ios-a4] Missing iOS asset catalog at: $IOS_ASSETS_DIR"
  echo "[ios-a4] Run IOS-A1 first (bootstrap-capacitor-ios.sh) to generate ios/App project files."
  exit 1
fi

if [[ ! -d "$BRAND_DIR" ]]; then
  echo "[ios-a4] Missing brand-pack export directory: $BRAND_DIR"
  echo "[ios-a4] Create the folder and export files listed in docs/mobile/ios-a4-icon-launch-assets.md."
  exit 1
fi

python3 - "$BRAND_DIR" "$APPICON_SET_DIR" "$SPLASH_SET_DIR" <<'PY'
import json
import os
import shutil
import struct
import sys
from pathlib import Path

brand_dir = Path(sys.argv[1])
appicon_dir = Path(sys.argv[2])
splash_dir = Path(sys.argv[3])

ICON_FILES = [
    "icon-notification-20@2x.png",
    "icon-notification-20@3x.png",
    "icon-settings-29@2x.png",
    "icon-settings-29@3x.png",
    "icon-spotlight-40@2x.png",
    "icon-spotlight-40@3x.png",
    "icon-app-60@2x.png",
    "icon-app-60@3x.png",
    "icon-app-store-1024.png",
]

SPLASH_FILES_REQUIRED = [
    "splash-logo-1x.png",
    "splash-logo-2x.png",
    "splash-logo-3x.png",
]
SPLASH_FILES_OPTIONAL = [
    "splash-logo-dark-1x.png",
    "splash-logo-dark-2x.png",
    "splash-logo-dark-3x.png",
]

DIMENSIONS = {
    "icon-notification-20@2x.png": (40, 40),
    "icon-notification-20@3x.png": (60, 60),
    "icon-settings-29@2x.png": (58, 58),
    "icon-settings-29@3x.png": (87, 87),
    "icon-spotlight-40@2x.png": (80, 80),
    "icon-spotlight-40@3x.png": (120, 120),
    "icon-app-60@2x.png": (120, 120),
    "icon-app-60@3x.png": (180, 180),
    "icon-app-store-1024.png": (1024, 1024),
    "splash-logo-1x.png": (120, 120),
    "splash-logo-2x.png": (240, 240),
    "splash-logo-3x.png": (360, 360),
    "splash-logo-dark-1x.png": (120, 120),
    "splash-logo-dark-2x.png": (240, 240),
    "splash-logo-dark-3x.png": (360, 360),
}


def png_size(path: Path):
    raw = path.read_bytes()
    if raw[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"{path} is not a PNG")
    return struct.unpack(">II", raw[16:24])


def ensure_files(files):
    missing = [name for name in files if not (brand_dir / name).exists()]
    if missing:
        names = ", ".join(missing)
        raise SystemExit(f"[ios-a4] Missing brand-pack files: {names}")


def validate_sizes(files):
    for name in files:
        p = brand_dir / name
        w, h = png_size(p)
        expected = DIMENSIONS[name]
        if (w, h) != expected:
            raise SystemExit(f"[ios-a4] Invalid dimensions for {name}: got {w}x{h}, expected {expected[0]}x{expected[1]}")


def reset_dir(path: Path):
    if path.exists():
        shutil.rmtree(path)
    path.mkdir(parents=True, exist_ok=True)


ensure_files(ICON_FILES)
ensure_files(SPLASH_FILES_REQUIRED)
validate_sizes(ICON_FILES + SPLASH_FILES_REQUIRED)

present_optional = [name for name in SPLASH_FILES_OPTIONAL if (brand_dir / name).exists()]
if present_optional:
    validate_sizes(present_optional)

reset_dir(appicon_dir)
reset_dir(splash_dir)

for name in ICON_FILES:
    shutil.copy2(brand_dir / name, appicon_dir / name)

for name in SPLASH_FILES_REQUIRED + present_optional:
    shutil.copy2(brand_dir / name, splash_dir / name)

appicon_contents = {
    "images": [
        {"filename": "icon-notification-20@2x.png", "idiom": "iphone", "scale": "2x", "size": "20x20"},
        {"filename": "icon-notification-20@3x.png", "idiom": "iphone", "scale": "3x", "size": "20x20"},
        {"filename": "icon-settings-29@2x.png", "idiom": "iphone", "scale": "2x", "size": "29x29"},
        {"filename": "icon-settings-29@3x.png", "idiom": "iphone", "scale": "3x", "size": "29x29"},
        {"filename": "icon-spotlight-40@2x.png", "idiom": "iphone", "scale": "2x", "size": "40x40"},
        {"filename": "icon-spotlight-40@3x.png", "idiom": "iphone", "scale": "3x", "size": "40x40"},
        {"filename": "icon-app-60@2x.png", "idiom": "iphone", "scale": "2x", "size": "60x60"},
        {"filename": "icon-app-60@3x.png", "idiom": "iphone", "scale": "3x", "size": "60x60"},
        {"filename": "icon-app-store-1024.png", "idiom": "ios-marketing", "scale": "1x", "size": "1024x1024"},
    ],
    "info": {"author": "xcode", "version": 1},
}

splash_images = [
    {"filename": "splash-logo-1x.png", "idiom": "universal", "scale": "1x"},
    {"filename": "splash-logo-2x.png", "idiom": "universal", "scale": "2x"},
    {"filename": "splash-logo-3x.png", "idiom": "universal", "scale": "3x"},
]

if present_optional:
    splash_images.extend([
        {
            "filename": "splash-logo-dark-1x.png",
            "idiom": "universal",
            "scale": "1x",
            "appearances": [{"appearance": "luminosity", "value": "dark"}],
        },
        {
            "filename": "splash-logo-dark-2x.png",
            "idiom": "universal",
            "scale": "2x",
            "appearances": [{"appearance": "luminosity", "value": "dark"}],
        },
        {
            "filename": "splash-logo-dark-3x.png",
            "idiom": "universal",
            "scale": "3x",
            "appearances": [{"appearance": "luminosity", "value": "dark"}],
        },
    ])

splash_contents = {"images": splash_images, "info": {"author": "xcode", "version": 1}}

(appicon_dir / "Contents.json").write_text(json.dumps(appicon_contents, indent=2) + "\n")
(splash_dir / "Contents.json").write_text(json.dumps(splash_contents, indent=2) + "\n")

print("[ios-a4] App icon + splash image sets updated.")
print(f"[ios-a4] Dark splash variants: {'enabled' if present_optional else 'disabled (single-style)'}")
PY

echo "[ios-a4] NOTE: Open ios/App/App.xcworkspace and verify LaunchScreen.storyboard references Splash.imageset."
