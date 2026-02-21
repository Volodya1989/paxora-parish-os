# IOS-A1 Implementation Notes

Status: **PARTIAL — config files authored, bootstrap not executed, architecture conflict (webDir vs server-rendered app) unresolved**

## What was added
- `capacitor.config.ts` at repo root with app identity:
  - `appId`: `com.paxora.parishcenter`
  - `appName`: `Paxora Parish Center`
  - `server.url`: `CAPACITOR_APP_URL` (fallback `http://localhost:3000`)
- `scripts/mobile/bootstrap-capacitor-ios.sh` to perform install/init/add/sync steps for iOS.

## How to run
```bash
bash scripts/mobile/bootstrap-capacitor-ios.sh
```

## Expected output
- Adds Capacitor packages to `package.json`/lockfile.
- Generates native wrapper under `ios/`.

## Environment caveat
If package installation is blocked in CI/dev environment (e.g., npm registry access restrictions), run this script in a network-enabled environment and commit generated artifacts.
