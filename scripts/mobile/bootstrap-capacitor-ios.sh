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
  echo "[bootstrap] Adding iOS wrapper project"
  npx cap add ios
fi

echo "[bootstrap] Running initial iOS sync"
npx cap sync ios

echo "Capacitor iOS bootstrap complete."
