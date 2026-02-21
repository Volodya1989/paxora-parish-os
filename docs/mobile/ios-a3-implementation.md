# IOS-A3 Implementation Notes

Status: **COMPLETED (pipeline scaffolding in repo)**

## What was added
- `scripts/mobile/prepare-capacitor-webdir.mjs`
  - Creates `out/` webDir expected by Capacitor config.
  - Writes `out/index.html` redirect shell to `CAPACITOR_APP_URL` (fallback `http://localhost:3000`).
- `scripts/mobile/build-and-sync-ios.sh`
  - Runs `npm run build` for production validation.
  - Prepares webDir shell.
  - Runs `npx cap sync ios`.
- `package.json` scripts:
  - `mobile:prepare:webdir`
  - `mobile:ios:bootstrap`
  - `mobile:ios:sync`

## How to run
```bash
npm run mobile:ios:sync
```

## Notes
- This repo remains server-hosted Next.js; iOS wrapper uses remote URL loading.
- The webDir shell exists to keep Capacitor sync deterministic for native project updates.
- If npm registry access is blocked in an environment, run bootstrap/sync in a network-enabled environment.
