#!/usr/bin/env bash
set -euo pipefail

# IOS-A1/A3 bootstrap script
# Ensures Capacitor deps are present, initializes config, and creates iOS wrapper once.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if ! npm ls @capacitor/core @capacitor/cli @capacitor/ios >/dev/null 2>&1; then
  echo "[bootstrap] Installing Capacitor dependencies"
  npm install @capacitor/core
  npm install -D @capacitor/cli @capacitor/ios
fi

if [[ ! -f capacitor.config.ts ]]; then
  echo "[bootstrap] Initializing Capacitor config"
  npx cap init "Paxora Parish Center" com.paxora.parishcenter --web-dir .next
fi

if [[ ! -d ios/App ]]; then
  if [[ -d ios ]]; then
    if [[ -z "$(find ios -mindepth 1 -maxdepth 1 -print -quit)" ]]; then
      echo "[bootstrap] Removing empty ios/ placeholder directory before adding platform"
      rm -rf ios
    else
      echo "[bootstrap] Existing ios/ directory detected without ios/App; skipping cap add and proceeding to sync"
    fi
  fi
fi

if [[ ! -d ios/App && ! -d ios ]]; then
  echo "[bootstrap] Adding iOS wrapper project"
  npx cap add ios
fi

echo "[bootstrap] Running initial iOS sync"
npx cap sync ios

echo "Capacitor iOS bootstrap complete."
