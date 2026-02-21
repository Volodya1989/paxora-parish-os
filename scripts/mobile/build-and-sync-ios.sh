#!/usr/bin/env bash
set -euo pipefail

# IOS-A3 pipeline: reproducible build validation + iOS sync
# 1) Build Next.js app to validate production readiness
# 2) Prepare Capacitor webDir shell (`out/`) for native sync
# 3) Sync Capacitor iOS native project

npm run build
node scripts/mobile/prepare-capacitor-webdir.mjs
npx cap sync ios

echo "[mobile] iOS build + sync pipeline completed."
