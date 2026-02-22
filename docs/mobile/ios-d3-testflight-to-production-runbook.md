# IOS-D3: TestFlight → Production Release Runbook

## Purpose and scope
Operational runbook for promoting an iOS wrapper build from TestFlight candidate to App Store production release, with explicit rollback and hotfix paths.

Use this runbook for every iOS release after IOS-C4 evidence is complete.

Epic D acceptance mapping:
- Dry-run TestFlight submission must be recorded for the target release train.
- Runbook approval must be recorded from Eng/Product/Ops before production promotion.

## Dependencies and release gate
- Story dependency: **IOS-C4** smoke suite must be complete with artifacts (`docs/mobile/ios-c4-app-store-qa-smoke-suite.md`).
- Related reliability/policy docs:
  - `docs/mobile/ios-c1-sentry-monitoring.md`
  - `docs/mobile/ios-c2-push-behavior-matrix.md`
  - `docs/mobile/app-store-readiness-review.md`
  - `docs/mobile/ios-a1-implementation.md`

## Roles
| Role | Responsibility |
|---|---|
| Release Manager (Ops) | Drives checklist, collects approvals, records final decision |
| iOS Engineer | Prepares build/submission metadata, executes release/rollback/hotfix actions |
| QA | Executes IOS-C4 smoke and evidence validation |
| Product | Policy/copy approval and launch go/no-go |

## Phase 1 — Preconditions / Go-No-Go Inputs

Status values: `TODO` / `IN_PROGRESS` / `DONE` / `BLOCKED`.

| Item | Owner | Status | Evidence / Link |
|---|---|---|---|
| Release window confirmed (date/time + on-call coverage) | Ops | TODO |  |
| Dry-run TestFlight submission record linked (build, date, outcome) | Ops/Eng | TODO |  |
| Candidate commit SHA + changelog frozen | Eng | TODO |  |
| iOS version/build number plan confirmed | Eng | TODO |  |
| App Store Connect access + roles validated | Ops | TODO |  |
| Sentry DSN/env/release values prepared for candidate | Eng | TODO |  |
| Communication draft prepared (internal + incident channel) | Ops | TODO |  |

Go/no-go rule: do not proceed if any item is `BLOCKED`.

## Phase 2 — TestFlight Candidate Build Prep

| Item | Owner | Status | Evidence / Link |
|---|---|---|---|
| Run iOS web/sync pipeline (`npm run mobile:ios:pipeline`) for candidate assets | Eng | TODO |  |
| Verify runtime flags for wrapper validation build:
`NEXT_PUBLIC_IOS_NATIVE_SHELL=true`
`NEXT_PUBLIC_IOS_SAFE_GIVING_STRATEGY=hide_in_ios_native` | Eng | TODO |  |
| Upload candidate build to TestFlight with release notes | Eng | TODO |  |
| Record build identifiers (TestFlight build #, app version, commit SHA, Sentry release tag) | Eng | TODO |  |
| Confirm tester groups + required reviewers are assigned | Ops | TODO |  |

## Phase 3 — TestFlight Validation + Sign-Off Collection

### 3.1 Required IOS-C4 evidence linkage (hard gate)
Attach one complete IOS-C4 run record and artifact bundle for this exact build.

| Evidence pack item | Owner | Status | Evidence / Link |
|---|---|---|---|
| Build identifier set (build #, version, commit SHA) | Eng | TODO |  |
| QA smoke summary (PASS / CONDITIONAL PASS / FAIL) | QA | TODO |  |
| Screenshots/video/log pointers from all 6 IOS-C4 areas | QA | TODO |  |
| Giving behavior proof: wrapper mode shows no giving shortcut | QA | TODO |  |
| API/log evidence for `/api/parish/giving-shortcut` => `shortcut: null` in wrapper mode | QA | TODO |  |
| Eng sign-off | Eng | TODO |  |
| QA sign-off | QA | TODO |  |
| Product sign-off | Product | TODO |  |
| Ops sign-off | Ops | TODO |  |
| Runbook approval note captured (Eng/Product/Ops) | Ops | TODO |  |

### 3.2 Runtime/policy-sensitive release checks (required)
Use policy-safe wording aligned with readiness review:

> In our iOS native shell build, external donation/payment shortcuts are suppressed when `NEXT_PUBLIC_IOS_SAFE_GIVING_STRATEGY=hide_in_ios_native` and `NEXT_PUBLIC_IOS_NATIVE_SHELL=true`. In this mode, `/api/parish/giving-shortcut` returns `shortcut: null` and no giving shortcut is rendered in app headers.

| Check | Owner | Status | Evidence / Link |
|---|---|---|---|
| Native wrapper context verified (`app_shell=native_wrapper`) | QA | TODO |  |
| No giving shortcut rendered in wrapper UI surfaces | QA | TODO |  |
| `shortcut: null` evidence captured (network/server logs) | QA | TODO |  |
| App Review notes include policy-safe explanation + test credentials | Product/Ops | TODO |  |

Promotion gate: all rows in 3.1 and 3.2 must be `DONE`.

## Phase 4 — Promotion Decision + Production Submission/Release

| Step | Owner | Status | Evidence / Link |
|---|---|---|---|
| Go/No-Go call recorded with Eng/Product/Ops attendees | Ops | TODO |  |
| Final metadata/release notes check in App Store Connect | Product/Ops | TODO |  |
| Submit release for App Review or schedule phased/manual release | Eng/Ops | TODO |  |
| Record exact release mode (manual/phased/automatic) and timestamp | Ops | TODO |  |
| Post decision summary in release channel | Ops | TODO |  |

Decision outcomes:
- **GO:** release submitted/scheduled, proceed to monitoring window.
- **NO-GO:** stop promotion, open issue with blockers and next candidate plan.

## Phase 5 — Post-Release Verification + Monitoring Window

Monitoring window target: first 2 hours active watch + 24-hour follow-up check.

| Check | Owner | Status | Evidence / Link |
|---|---|---|---|
| Confirm production availability in App Store regions | Ops | TODO |  |
| Execute quick sanity pass (auth, tasks, events, chat upload, giving behavior) | QA | TODO |  |
| Validate Sentry event health by release and tags (`app_platform=ios`, `app_shell=native_wrapper`, `app_mode=testflight_wrapper`) | Eng | TODO |  |
| Track error rate/regressions; compare to pre-release baseline | Eng | TODO |  |
| Post 2-hour + 24-hour summary with status | Ops | TODO |  |

## Rollback Playbook (required)

### Triggers
Invoke rollback immediately on any of:
- P0 outage or data-loss risk.
- P1 App Review/policy risk (for example giving shortcut visible in wrapper when hide strategy is expected).
- Crash/error spike in Sentry tied to current release version.
- Critical auth, tasks/events persistence, or chat upload regression.

### Actions (ordered)
1. **Containment (Ops + Eng)**
   - Pause phased rollout or halt manual promotion in App Store Connect.
   - Freeze release communications; post incident notice in internal channel.
2. **Configuration rollback knobs (Eng)**
   - Re-assert runtime policy guard: `NEXT_PUBLIC_IOS_SAFE_GIVING_STRATEGY=hide_in_ios_native`.
   - Verify wrapper context guard: `NEXT_PUBLIC_IOS_NATIVE_SHELL=true`.
   - If monitoring noise blocks triage, apply fast-disable pattern from IOS-C1 by unsetting `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` temporarily.
3. **Build/App Store rollback options (Eng + Ops)**
   - Prefer stopping rollout and keeping prior stable production build live.
   - If new build already live, remove rollout momentum (phased stop) and prepare expedited hotfix build.
   - Production metadata rollback options: pause phased release, remove/replace release notes that instruct adoption, and mark the current version as halted in release tracker.
   - TestFlight metadata rollback options: expire the problematic build for tester groups, remove it from external groups, and annotate “do not test/use” in build notes.
   - Update release metadata/status notes to prevent accidental resume.
4. **Validation and logging (QA + Eng)**
   - Re-run targeted IOS-C4 critical checks (auth, tasks/events persistence, chat upload, giving behavior).
   - Capture Sentry snapshots and attach incident timeline.
5. **Communication (Ops)**
   - Log incident in runbook history and incident tracker.
   - Notify Eng/Product/Ops with trigger, impact, containment, next ETA.

Rollback exit criteria:
- User-impacting issue contained.
- Stable path confirmed with evidence.
- Clear next action: resume release or execute hotfix flow.

## Hotfix Workflow (required)

### Severity criteria
Use hotfix path for:
- P0 production outage,
- P1 policy/security/compliance risk,
- high-frequency crash/regression affecting core IOS-C4 flows.

### Workflow checklist
| Step | Owner | Status | Evidence / Link |
|---|---|---|---|
| Open hotfix incident ticket with severity and scope | Ops/Eng | TODO |  |
| Branch from latest production tag/commit (`hotfix/ios-<issue>`) | Eng | TODO |  |
| Apply minimal fix + bump iOS version/build number | Eng | TODO |  |
| Build candidate and upload TestFlight hotfix build | Eng | TODO |  |
| Run minimal regression checklist (below) | QA | TODO |  |
| Collect Eng/QA/Product/Ops re-approval | Ops | TODO |  |
| Re-submit/release hotfix build and start monitoring window | Eng/Ops | TODO |  |

Minimal regression checklist (must pass):
- Auth sign-in/session continuity/sign-out.
- Tasks create + complete persistence.
- Events create + RSVP persistence.
- Chat authorized upload + render.
- Giving behavior in wrapper mode (no shortcut rendered, `shortcut: null` evidence).
- Sentry events tagged correctly for new release.

## Release record template (copy per release)

```md
# iOS Release Record — <YYYY-MM-DD>

- Release manager:
- Candidate build # / version:
- Commit SHA:
- Sentry release tag:
- Dry-run TestFlight submission link:
- Release mode (manual/phased):

## Phase status summary
- Phase 1:
- Phase 2:
- Phase 3:
- Phase 4:
- Phase 5:

## Evidence pack links
- IOS-C4 run record:
- Artifact folder:
- Runtime/policy proof (`shortcut: null` + no giving shortcut screenshot):

## Sign-offs
- Eng:
- QA:
- Product:
- Ops:

## Outcome
- Final decision: GO / NO-GO / ROLLBACK / HOTFIX
- Notes:
```
