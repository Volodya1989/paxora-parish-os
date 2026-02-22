# iOS Epics A–D Overall Readiness Review (Staff+ Release Assessment)

Date: 2026-02-22  
Scope: IOS-A1..A4, IOS-B1..B5, IOS-C1..C5, IOS-D1..D4

## 1) Executive Summary

- IOS-A remains the primary launch gate: IOS-A1 and IOS-A2 are still partial and block native project generation/identity validation, while IOS-A4 is partial pending brand-pack + generated Xcode asset catalog state.
- IOS-B policy/security remediation is largely implemented in code/docs (chat media access controls, security headers, auth endpoint rate limiting, iOS-safe giving behavior, legal metadata baseline).
- IOS-C reliability/quality is mixed: C1 and C3 have substantial implementation footprints; C2 and C4 have documented frameworks but no attached run evidence proving pass on a candidate TestFlight build.
- IOS-D operations are strongly documented (metadata pack, screenshot pipeline, release runbook, CI lane), but execution evidence (dry run, completed artifact set, signed checklist) is not yet present.
- By roadmap DoD criteria, multiple stories are still short on QA artifact evidence and runbook-linked rollback proof at submission-candidate level.
- Account creation/setup in Apple Developer can proceed now (administrative prerequisite).
- TestFlight execution is not ready due to unresolved A-foundation and missing C4 pass evidence.
- App Store submission execution is not ready due to unresolved P0/P1 readiness proof (native wrapper readiness, full submission evidence package completion).

## 2) Epic-by-Epic Assessment

### Epic A — iOS Submission Foundation

| Story | Status | Evidence source | Risk | Dependency impact |
|---|---|---|---|---|
| IOS-A1 | Partial | Roadmap marks partial; `ios/` project currently absent; Capacitor config + bootstrap exist. | P0 | Blocks A2 validation, TestFlight build path, native submission execution. |
| IOS-A2 | Partial / Blocked | Roadmap marks partial + blocked by A1; identity script exists but requires `ios/App/*` files. | P0 | Blocks signing identity confirmation and upload readiness. |
| IOS-A3 | Complete | Roadmap marks completed; npm pipeline scripts present for web build + iOS sync. | P0 | Provides deterministic pipeline baseline for D4 CI lane. |
| IOS-A4 | Partial | Roadmap marks partial; icon/splash pipeline exists but depends on generated iOS project and approved brand pack assets. | P0 | Blocks final screenshot/readiness quality for App Store packaging. |

### Epic B — App Review Blockers & Policy Compliance

| Story | Status | Evidence source | Risk | Dependency impact |
|---|---|---|---|---|
| IOS-B1 | Complete | Chat image route enforces auth, parish scope, and channel/group membership checks before serving media. | P0 | Unblocks C3/C4 policy-sensitive chat evidence. |
| IOS-B2 | Complete | Next config applies CSP/HSTS/referrer/permissions/frame protections globally. | P0 | Baseline web security posture for review readiness. |
| IOS-B3 | Complete | Public auth flows have sliding-window limits for sign-in, reset request/submit, and verify-email. | P0 | Reduces abuse/compliance risk for submission review. |
| IOS-B4 | Complete (implementation), monitor in QA | iOS-safe giving strategy hides shortcut in native shell via env strategy + API null response path. | P0 | Must be re-validated in each C4 smoke to avoid review regression. |
| IOS-B5 | Partial | Legal/support/deletion metadata docs exist, but production URL finalization and final legal sign-off evidence are still open-ended placeholders/checklist items. | P0 | Blocks confidence in final ASC legal metadata lock. |

### Epic C — iOS Product Quality & Reliability

| Story | Status | Evidence source | Risk | Dependency impact |
|---|---|---|---|---|
| IOS-C1 | Partial | Sentry integration files/docs exist, but TestFlight-tagged event evidence is not attached in repo artifacts. | P1 | Monitoring confidence gap during pilot rollout. |
| IOS-C2 | Partial | Push behavior matrix and supported-mode decision are documented; no attached execution artifact set in repo snapshot. | P1 | Push expectation ambiguity risk during QA/review notes. |
| IOS-C3 | Complete (feature), Partial (evidence) | Content-report data model/actions/UI/admin queue implemented + documented; TestFlight QA evidence not attached here. | P1 | Moderation capability exists; still needs submission-evidence packet. |
| IOS-C4 | Partial | Full smoke suite and templates exist, but no completed dated PASS run artifact is linked in-repo. | P1 | Blocks D3 release go/no-go confidence. |
| IOS-C5 | Partial | C5 remains roadmap item; env naming alignment appears improved but no explicit closure artifact declaring completed normalization audit. | P1 | Ops misconfiguration risk persists without final closure proof. |

### Epic D — App Store Operations

| Story | Status | Evidence source | Risk | Dependency impact |
|---|---|---|---|---|
| IOS-D1 | Partial | Comprehensive metadata pack exists; still uses placeholder public domain values pending final production substitution/legal lock. | P1 | Blocks final ASC entry completion. |
| IOS-D2 | Partial | Screenshot capture pipeline/checklist/template exists, but no completed screenshot set attached. | P1 | Blocks ASC media upload readiness. |
| IOS-D3 | Partial | TestFlight→production runbook including rollback/hotfix exists, but no executed dry-run record included. | P1 | Blocks operational launch confidence. |
| IOS-D4 | Complete (lane), Partial (native archive coverage) | CI workflow exists and uploads artifacts; explicit ubuntu skip for native xcodebuild is documented. | P1 | Needs complementary macOS native archive validation before final submission. |

## 3) Blockers & Risks

### Critical blockers by launch gate

#### Apple account setup readiness
- No P0 engineering blocker for account creation itself; this is administrative and can start immediately.

#### TestFlight readiness (critical)
- IOS-A1/A2 unresolved native project + identity validation path (P0).
- IOS-A4 unresolved brand-pack/Xcode asset completion (P0).
- IOS-B5 legal metadata final URL/sign-off certainty still partial (P0 for review package completeness).
- IOS-C4 lacks completed PASS evidence run artifacts for a candidate build (P1 but practical gate blocker for release control).

#### App Store submission readiness (critical)
- All TestFlight blockers above.
- IOS-D1/D2/D3 execution evidence incomplete (metadata lock, screenshots, release dry run).
- IOS-D4 lane skips native archive on ubuntu; macOS archive/signing evidence must exist for final submission confidence.

### Policy-sensitive validation checks

| Policy-sensitive area | Current assessment | Risk |
|---|---|---|
| Chat media access control | Implemented with session + parish + channel/group membership checks in image proxy route. | P0 mitigated |
| Security headers / rate limits | Security headers and auth endpoint rate limiting implemented. | P0 mitigated |
| Giving shortcut in iOS native wrapper | Strategy exists to suppress giving shortcut in native shell and return `shortcut: null`; must be proven per build via C4 evidence. | P1 regression risk |
| Account deletion discoverability wording | In-app deletion flow + privacy/terms/store metadata wording are aligned and explicit about `Profile → Delete account` + support contact. | P1 (final legal URL lock) |
| Push behavior clarity by runtime mode | Matrix clearly defines supported mode and unsupported wrapper guarantee; missing attached execution evidence set. | P1 |

## 4) Readiness Gates

### Gate 1: Apple Developer account setup
- Decision: **READY**
- Basis: account creation/setup is administrative and not blocked by unresolved build/submission stories.

### Gate 2: TestFlight build/upload
- Decision: **NOT_READY**
- Unresolved P0: IOS-A1, IOS-A2, IOS-A4, and partially-open IOS-B5 packaging/legal closure.

### Gate 3: App Store submission
- Decision: **NOT_READY**
- Unresolved readiness package: D1/D2/D3 execution evidence plus native archive/signing proof and completed C4 evidence on candidate build.

## 5) Action Plan (prioritized)

### Must do now (P0)

| Item | Suggested owner | Effort |
|---|---|---|
| Close IOS-A1: generate/validate `ios/App` project in reproducible environment and verify pipeline output. | Eng | M |
| Close IOS-A2: run identity script against real Xcode project, confirm bundle/version/build/team settings via xcodebuild/plist checks. | Eng | S |
| Close IOS-A4: ingest approved brand-pack assets, run assets script, validate icon/launch sets in Xcode. | Product + Design + Eng | S-M |
| Close IOS-B5 finalization: replace placeholder public URLs, legal sign-off, freeze review-note wording. | Product + Legal | S |

### Before first submission (P1)

| Item | Suggested owner | Effort |
|---|---|---|
| Execute IOS-C4 full smoke on candidate build and attach evidence artifacts with PASS sign-off. | QA + Eng | S |
| Execute IOS-C2 matrix evidence set (wrapper/PWA/Safari) and link in release packet. | QA + Eng | M |
| Validate IOS-C1 telemetry on TestFlight (tagged events visible) and capture proof. | Eng | S |
| Complete IOS-D1 metadata final entry with production values and reviewer sign-off. | Product + Legal | S |
| Complete IOS-D2 screenshot capture on required device classes with signed checklist. | Product + Design + QA | M |
| Run IOS-D3 dry-run go/no-go with rollback/hotfix simulation notes. | Ops + Eng + QA | S |
| Add macOS-native archive/signing validation evidence complementing D4 ubuntu lane. | Eng/Ops | M |

### Post-initial launch (P2)

| Item | Suggested owner | Effort |
|---|---|---|
| Harden automated evidence collection for C4/D2 to reduce manual drift. | QA + Eng | M |
| Expand moderation/report-content UX and escalation automation beyond baseline C3. | Product + Eng | M |
| Mature release metrics/alerting runbooks for incident trend analysis. | Ops + Eng | M |

## 6) Final Verdict

- **APPLE_DEVELOPER_ACCOUNT: READY**
- **TESTFLIGHT: NOT_READY**
- **APP_STORE_SUBMISSION: NOT_READY**

The project is ready to create/setup the Apple Developer account immediately because that administrative step does not require completion of Epics A–D. However, TestFlight and App Store submission execution are not yet ready due to unresolved P0 foundation/compliance closure in A1/A2/A4/B5 and incomplete execution evidence across C4 and D1–D3 (plus native archive/signing proof beyond ubuntu CI). The code/docs posture is improving and many blockers are already implemented, but release readiness still requires completion artifacts rather than plan-level documentation alone.
