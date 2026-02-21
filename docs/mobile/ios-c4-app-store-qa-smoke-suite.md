# IOS-C4: App Store QA Smoke Suite (TestFlight)

## Purpose
This smoke suite provides a repeatable, evidence-first QA pass for iOS/TestFlight readiness before App Store submission gates.

It covers IOS-C4 scope from the roadmap: auth, onboarding/access gate, tasks, events, chat upload, and giving shortcut behavior.

## Source alignment (authoritative references)
- Roadmap scope + Week 3 dependency context: `docs/PRODUCT_ROADMAP.md` (IOS-C4, M3, IOS-D3 dependency).
- Policy framing and giving behavior language: `docs/mobile/app-store-readiness-review.md`.
- Runtime-mode evidence style/template pattern: `docs/mobile/ios-c2-push-behavior-matrix.md`.
- Baseline pilot smoke checks this extends (not replaces): `docs/pilot-runbook.md`.

## When to run
- For each TestFlight candidate build.
- After changes touching auth, onboarding, tasks/events, chat attachments, shell mode detection, or giving shortcut logic.

## Preconditions (before starting)
- Test accounts prepared:
  - one approved member account,
  - one gated/pending account.
- Environment/runtime values confirmed for wrapper run:
  - `NEXT_PUBLIC_IOS_NATIVE_SHELL=true`
  - `NEXT_PUBLIC_IOS_SAFE_GIVING_STRATEGY=hide_in_ios_native`
- Evidence file initialized (copy template below or generate with helper script):
  - `bash scripts/mobile/generate-ios-c4-evidence-template.sh`

## Required runtime/policy setup
Use these values for the iOS native wrapper smoke run:

- `NEXT_PUBLIC_IOS_NATIVE_SHELL=true`
- `NEXT_PUBLIC_IOS_SAFE_GIVING_STRATEGY=hide_in_ios_native`

Policy expectation (reuse for QA notes/App Review notes):

> In our iOS native shell build, external donation/payment shortcuts are suppressed when `NEXT_PUBLIC_IOS_SAFE_GIVING_STRATEGY=hide_in_ios_native` and `NEXT_PUBLIC_IOS_NATIVE_SHELL=true`. In this mode, `/api/parish/giving-shortcut` returns `shortcut: null` and no giving shortcut is rendered in app headers.

## Test matrix (IOS-C4)

| Area | Scenario | Expected result | Evidence minimum |
|---|---|---|---|
| Auth | Sign in, app restart/background-foreground, sign out | Sign in succeeds, session continuity holds across relaunch, sign out returns to auth surface | 2 screenshots + 1 short video of continuity check |
| Onboarding/access gate | New/incomplete member enters access-gated flow, then approved path | Gate messaging is clear, no dead-end loop, approved user reaches app shell | 2 screenshots (gate + post-approval landing) |
| Tasks | Create task and mark complete | Task is created in correct parish context, completion state persists after refresh | 2 screenshots (created + completed) |
| Events | Create event and RSVP | Event is visible on calendar/event detail; RSVP success state persists | 2 screenshots (event detail + RSVP state) |
| Chat upload | Upload attachment/image and verify render | Authorized user can upload; attachment renders in thread; no auth error for permitted user | 1 upload screenshot + 1 render screenshot + upload response/log snippet |
| Giving shortcut behavior | Validate iOS-safe strategy in wrapper mode | With wrapper + hide strategy, no giving shortcut rendered; API indicates `shortcut: null` | 1 screenshot of header/nav surface + API/log evidence |

## Detailed execution steps

### 1) Auth smoke
1. Launch TestFlight build and sign in with QA member account.
2. Kill app, relaunch, then background/foreground once.
3. Confirm user remains authenticated.
4. Sign out.
5. Confirm auth screen appears and protected routes are not accessible.

Failure triage hints:
- If continuity fails, capture session timestamp + build ID and check auth cookie/session expiration config.
- If sign-out fails, record route and whether stale UI cache appears.

### 2) Onboarding/access gate smoke
1. Use account in pending/incomplete onboarding state.
2. Sign in and verify access gate screen/copy.
3. Complete required step or switch to approved test account.
4. Confirm transition into main app shell without loop.

Failure triage hints:
- If gate loops, capture account role/state and redirect target route.
- If copy contradicts current policy, flag as P2 copy mismatch and attach screenshot.

### 3) Tasks smoke (create + complete)
1. Open Tasks/Serve surface in target parish.
2. Create a new task with clear title `IOS-C4 smoke <date>`.
3. Mark task complete.
4. Refresh/reopen screen and confirm completion persists.

Failure triage hints:
- If create fails, capture form payload + error toast/message.
- If completion does not persist, capture before/after refresh evidence.

### 4) Events smoke (create + RSVP)
1. Create event `IOS-C4 smoke event <date>`.
2. Open event detail and submit RSVP.
3. Reopen event detail/calendar and confirm RSVP state is retained.

Failure triage hints:
- If RSVP fails, capture response status and account role.
- If event visibility differs by view, capture both calendar + detail state.

### 5) Chat upload smoke (authorized upload + render)
1. Enter a channel where tester has confirmed membership.
2. Upload image/file attachment.
3. Confirm message posts and attachment renders for same authorized user.
4. (Optional) confirm second authorized user can view same attachment.

Failure triage hints:
- If upload fails, capture response code/body and file metadata (size/type).
- If render fails after upload success, capture attachment URL key and thread ID.

### 6) Giving shortcut behavior smoke (iOS-safe strategy)
1. Confirm runtime mode is iOS wrapper (`NEXT_PUBLIC_IOS_NATIVE_SHELL=true`).
2. Confirm strategy is `hide_in_ios_native`.
3. Open app header/shortcut surfaces where giving would normally appear.
4. Verify giving shortcut is absent.
5. Verify evidence that giving API resolves to `shortcut: null` (network log or server log snippet).

Failure triage hints:
- If giving shortcut appears in wrapper mode, classify as **P1 App Review policy risk**.
- Capture runtime mode flags and screenshot proving visible shortcut.

## Pass/fail rubric
- **PASS:** All six areas pass with complete evidence attached.
- **CONDITIONAL PASS:** Non-policy P2 issue only, triaged with owner/date and no P0/P1 risk.
- **FAIL:** Any auth break, task/event data integrity issue, chat authorized upload/render break, or giving shortcut policy mismatch in wrapper mode.

## Artifact naming convention (recommended)
- Folder: `artifacts/ios-c4/<YYYY-MM-DD>/`
- Screenshots: `<area>-<step>-<device>.png` (example: `giving-header-iphone14pro.png`)
- Video: `auth-session-continuity-<device>.mp4`
- Logs: `network-giving-shortcut-null.txt`, `chat-upload-response.json`

## QA evidence template (copy/paste)

```md
# IOS-C4 Smoke Run Record

- Date:
- Tester:
- Device model:
- iOS version:
- App build (TestFlight build # / commit SHA):
- Runtime mode: (native_wrapper / pwa_standalone / safari_tab)
- Runtime flags:
  - NEXT_PUBLIC_IOS_NATIVE_SHELL=
  - NEXT_PUBLIC_IOS_SAFE_GIVING_STRATEGY=

## Results by area
| Area | Expected | Actual | Pass/Fail | Artifact links/files |
|---|---|---|---|---|
| Auth |  |  |  |  |
| Onboarding/access gate |  |  |  |  |
| Tasks (create + complete) |  |  |  |  |
| Events (create + RSVP) |  |  |  |  |
| Chat upload/render |  |  |  |  |
| Giving shortcut behavior |  |  |  |  |

## Artifacts index
- Screenshots:
- Video:
- Logs/network snippets:

## Defects / triage notes
- Severity:
- Owner:
- Target fix build/date:

## Final status
- Overall: PASS / CONDITIONAL PASS / FAIL
- Reviewer sign-off:
```

## Quick-start for QA
1. Prepare one approved member account and one gated/pending account.
2. Generate a run record (`bash scripts/mobile/generate-ios-c4-evidence-template.sh`) or copy the template block.
3. Run the six smoke sections in order.
4. Fill expected vs actual and artifact links during execution.
5. Attach artifacts in the TestFlight run ticket.
6. Mark PASS/FAIL and escalate any P1 immediately.
