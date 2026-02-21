# IOS-C2: iOS Push Behavior Matrix (Wrapper vs PWA vs Safari)

## Objective
Validate and document the supported iOS push-notification mode for launch, while preventing misleading install/browser prompts in the iOS native wrapper shell.

## Behavior matrix

| Runtime mode | Install prompt behavior | Notification permission prompt behavior | Push subscription path | Expected outcome | User-facing copy guidance | QA evidence artifact |
|---|---|---|---|---|---|---|
| iOS native wrapper (WKWebView / Capacitor shell) | **Suppressed**. Do not show Add-to-Home-Screen/browser install prompts. | Browser Notification API behavior is not a supported launch path for wrapper mode. | Do **not** rely on web service-worker push subscription as a launch guarantee in wrapper mode. | **Not supported** for launch push guarantee (treat as unsupported for iOS C2). | Use explicit copy: “Push notifications are not available in this TestFlight wrapper build. Use the installed home-screen app for web push testing.” Avoid browser-install CTA language. | Screenshot/video proving no A2HS modal is shown in wrapper; runtime logs indicating `app_shell=native_wrapper`. |
| iOS installed PWA (Safari Add to Home Screen) | No install prompt once already installed; browser can show A2HS guidance before install only. | Permission prompt can be requested from a user gesture in standalone mode (iOS 16.4+ behavior). | Service worker + PushManager subscription via existing `/api/push/*` endpoints. | **Supported** (official iOS launch mode for web push). | Encourage enabling notifications from the installed home-screen app; keep existing enable/deny guidance. | Screenshot/video of prompt + successful enable state; push subscription server response/log; delivered test notification evidence. |
| iOS Safari tab (not installed) | A2HS guidance may appear according to engagement rules. | Permission/push path is not considered reliable/eligible for launch push behavior without install. | No official launch subscription expectation in plain Safari-tab mode. | **Partial / not supported for launch push** (install required). | Copy should direct users to install to home screen for notification support. | Screenshot of Safari-tab prompts and guidance text; log showing no supported push enable outcome without install. |

## Supported mode decision

For iOS launch, the **officially supported push mode is installed iOS PWA (Add to Home Screen, standalone)**.

- Native wrapper mode is treated as **unsupported for push guarantee** in IOS-C2 and must not show browser/PWA install prompts.
- Safari-tab mode is **not a launch-grade push mode**; users should be guided to install the PWA.

## Test steps (manual, reproducible)

### 1) Native wrapper simulation / TestFlight shell mode
1. Start app with `NEXT_PUBLIC_IOS_NATIVE_SHELL=true` (or run in actual Capacitor/TestFlight wrapper).
2. Navigate through engagement-eligible screens multiple times (to trigger prompt cadence if not guarded).
3. Verify no Add-to-Home-Screen modal or browser-install CTA appears.
4. Open notification settings/toggle surfaces and verify no misleading “install in browser” guidance is shown for wrapper.
5. Capture evidence:
   - Screen recording or screenshots of visited screens with no A2HS modal.
   - Console/runtime logs with shell context tags (`app_shell=native_wrapper`, `app_mode=testflight_wrapper`).

### 2) Installed iOS PWA mode
1. Open in Safari on iOS, then use Share → Add to Home Screen.
2. Launch from home-screen icon (standalone mode).
3. Trigger notification enable flow from user gesture.
4. Confirm permission prompt appears and can be granted.
5. Validate subscription registration succeeds (network/API log and server acceptance).
6. Send a test notification and confirm delivery.
7. Capture evidence:
   - Permission prompt screenshot.
   - Enabled-state screenshot.
   - Test push delivery screenshot/video.
   - Endpoint/subscription log snippet.

### 3) Safari-tab mode (not installed)
1. Open app in mobile Safari tab (without launching from home screen).
2. Trigger engagement prompt flow.
3. Verify UI guidance nudges toward Add-to-Home-Screen for push-capable behavior.
4. Attempt notification enable flow and verify this is not treated as launch-supported path.
5. Capture evidence:
   - Prompt/guidance screenshot.
   - Any permission/subscription result logs.

## QA evidence checklist template

For each mode, collect:
- Device + iOS version.
- App build identifier (web commit SHA / TestFlight build number).
- Runtime mode (`native_wrapper` / `pwa_standalone` / `safari_tab`).
- Expected result.
- Actual result.
- Artifacts:
  - screenshot(s),
  - video (optional but preferred for prompt flow),
  - log snippets (console/network/server).
- Pass/fail + reviewer initials/date.

## Rollback / mitigation if unsupported mode regresses

If wrapper mode starts showing browser/PWA prompts or push flow confusion:
1. Re-enable wrapper guard to suppress engagement install/prompt modals in native shell context.
2. Temporarily disable wrapper-facing push CTA copy and route users to supported installed-PWA mode.
3. Re-run IOS-C2 matrix validation and attach fresh evidence before next TestFlight submission.
