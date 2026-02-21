#!/usr/bin/env bash
set -euo pipefail

# IOS-A1 bootstrap script
# Installs Capacitor deps and generates the iOS wrapper project.

npm install @capacitor/core
npm install -D @capacitor/cli @capacitor/ios

# Initialize Capacitor in current repository
npx cap init "Paxora Parish Center" com.paxora.parishcenter --web-dir out

# Generate iOS project
npx cap add ios

# Sync current web assets/config into iOS wrapper
npx cap sync ios

echo "Capacitor iOS bootstrap complete."
