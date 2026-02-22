# iOS Capacitor Foundation (IOS-A1) + Build/Sync Pipeline (IOS-A3)

Status: **COMPLETED for foundation + reproducible build/sync wiring**

## What is in place
- Root-level Capacitor configuration in `capacitor.config.ts`:
  - `appId`: `com.paxora.parishcenter`
  - `appName`: `Paxora Parish Center`
  - `webDir`: `.next` (aligned with Next.js production build output)
  - `server.url`: `CAPACITOR_APP_URL` (fallback `http://localhost:3000`)
- Bootstrap script `scripts/mobile/bootstrap-capacitor-ios.sh`:
  - verifies/install Capacitor deps (if missing)
  - initializes Capacitor config (if missing)
  - adds iOS wrapper project (if missing)
  - runs initial iOS sync
- IOS-A3 npm scripts:
  - `npm run mobile:web:build`
  - `npm run mobile:ios:sync` (runs bootstrap + iOS sync, idempotent)
  - `npm run mobile:ios:pipeline`

## Local workflow
1. Bootstrap once (new environments only):
   ```bash
   bash scripts/mobile/bootstrap-capacitor-ios.sh
   ```
2. Run reproducible web asset build + iOS sync:
   ```bash
   npm run mobile:ios:pipeline
   ```

## CI workflow (TestFlight prep baseline)
Use this sequence in CI after dependencies are installed:
```bash
npm ci
npm run mobile:ios:pipeline
```

Optional: pin the wrapped web app endpoint used by the native shell:
```bash
CAPACITOR_APP_URL="https://<staging-or-production-host>" npm run mobile:ios:sync
```

## CI non-macOS behavior
- On non-macOS runners (for example `ubuntu-latest`), the bootstrap script runs `npx cap copy ios` instead of `npx cap sync ios` to avoid `pod install` / Xcode dependency failures.
- On macOS, the script continues to run full `npx cap sync ios`.
- If CI is missing Capacitor dependencies, bootstrap exits with an explicit error instead of mutating lockfiles via `npm install`.

## Why this resolves prior mismatch
Capacitor now syncs from `.next`, and the production asset step for iOS uses `npm run build` (which writes `.next`). This removes the previous `webDir: out` vs Next build-output mismatch risk.
