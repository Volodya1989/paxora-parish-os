# iOS Epics A–D Overall Readiness Review (Staff+ Release Assessment)

**Date:** 2026-02-22
**Reviewer:** Staff Eng (automated deep audit)
**Scope:** IOS-A1..A4, IOS-B1..B5, IOS-C1..C5, IOS-D1..D4
**Authoritative inputs:**
- `docs/PRODUCT_ROADMAP.md` (sections 11.1–11.6)
- `docs/mobile/app-store-readiness-review.md`
- `docs/mobile/ios-c2-push-behavior-matrix.md`
- `docs/mobile/ios-c4-app-store-qa-smoke-suite.md`
- `docs/pilot-runbook.md`
- All implementation docs in `docs/mobile/ios-*.md`
- Direct file-level verification of code, config, scripts, and CI artifacts

---

## 1) Executive Summary

- **Epic A is the primary launch gate.** IOS-A1 and IOS-A2 remain PARTIAL: `ios/` contains only `.gitkeep`, Capacitor npm packages are not in `package.json`, and the identity script has never been validated against a real Xcode project. IOS-A3 is COMPLETE (pipeline scripts wired). IOS-A4 is PARTIAL (asset pipeline authored but blocked on missing `ios/App` project and brand-pack source files).
- **Epic B policy/security work is substantially complete in code.** Chat media auth (B1), security headers (B2), auth rate limiting (B3), iOS-safe giving strategy (B4) are all implemented and verified in source. IOS-B5 legal metadata has docs and a codified `appStoreMetadata.ts` module but uses placeholder domain values pending production URL lock and final legal sign-off.
- **Epic C reliability/quality is mixed.** C1 (Sentry) has vendored package + config files + shell context tags but no attached TestFlight evidence. C2 (push matrix) is documented but unexecuted. C3 (report content) is feature-complete with data model/actions/UI/admin queue. C4 (QA smoke) has a thorough framework but no completed PASS run. C5 (env naming) has no explicit closure artifact.
- **Epic D operations are strongly documented but unexecuted.** D1 metadata pack is comprehensive but placeholder-bound. D2 screenshot pipeline exists with no captured set. D3 release runbook has no dry-run record. D4 CI lane exists on ubuntu-latest with explicit macOS-native skip.
- **Apple Developer account creation can proceed immediately** — it is administrative and not blocked by any engineering artifact.
- **TestFlight and App Store submission are NOT READY** due to unresolved P0 foundation blockers (A1/A2/A4) and absence of execution-level evidence across C and D epics.
- **The codebase itself is mature and well-built.** The gap is concentrated in native packaging, brand asset ingestion, and execution evidence — not in the web application's feature completeness or security posture.

---

## 2) Epic-by-Epic Assessment

### Epic A — iOS Submission Foundation

| Story | Status | Evidence Source | Risk | Dependency Impact |
|---|---|---|---|---|
| IOS-A1 | **Partial** | `capacitor.config.ts` exists with `webDir: ".next"` and `server.url` (live-server mode). `scripts/mobile/bootstrap-capacitor-ios.sh` exists. **However:** `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios` are NOT in `package.json:29-63`. `ios/` contains only `.gitkeep`. Bootstrap script was never executed. `docs/mobile/ios-a1-implementation.md:3` still says "COMPLETED" which contradicts repo reality. | **P0** | Blocks A2 validation, A4 asset catalog placement, all TestFlight/submission paths, D4 native archive. |
| IOS-A2 | **Partial / Blocked** | `scripts/mobile/configure-ios-identity.sh` exists and is well-structured (PlistBuddy + perl). `package.json:18` has `mobile:ios:identity` alias. `docs/mobile/ios-a2-implementation.md:3` correctly says "PARTIAL". **However:** script targets `ios/App/App.xcodeproj/project.pbxproj` and `ios/App/App/Info.plist` which do not exist. Never validated against real files. | **P0** | Blocks signing identity confirmation, `DEVELOPMENT_TEAM` setup, device/TestFlight builds. |
| IOS-A3 | **Complete** | `package.json:19-21` defines `mobile:web:build`, `mobile:ios:sync`, `mobile:ios:pipeline`. `docs/mobile/ios-a1-implementation.md:17-19` documents pipeline. `ios-a1-implementation.md:43-48` documents CI non-macOS copy/skip behavior. `docs/PRODUCT_ROADMAP.md:418` marks COMPLETED. | Resolved | Provides deterministic pipeline for D4 CI lane. |
| IOS-A4 | **Partial** | `scripts/mobile/configure-ios-assets.sh` exists. `docs/mobile/ios-a4-icon-launch-assets.md` documents pipeline + QA checklist. `assets/brand/ios/README.md` defines required icon/splash PNG specs. Reusable sources exist: `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/apple-touch-icon.png`. **However:** brand-pack PNGs (9 icon sizes + splash variants) not committed. `ios/App/App/Assets.xcassets/` does not exist. `docs/mobile/ios-a4-icon-launch-assets.md:82-84` acknowledges blockers. | **P0** | Blocks App Store 1024px icon, launch screen, screenshot visual quality. |

### Epic B — App Review Blockers & Policy Compliance

| Story | Status | Evidence Source | Risk | Dependency Impact |
|---|---|---|---|---|
| IOS-B1 | **Complete** | `app/api/chat/images/[...key]/route.ts` enforces: `getServerSession()` (401 if missing), `parishId` validation, channel format validation, MIME type allowlist, `getParishMembership()` check, GROUP channel group-membership check, non-GROUP channel membership check, signed R2 URLs with 10-min expiry. `docs/mobile/app-store-readiness-review.md:77` originally flagged as P0-4. | **P0 mitigated** | Unblocks C3/C4 chat upload evidence. |
| IOS-B2 | **Complete** | `next.config.mjs` applies: CSP (`default-src 'self'`, script/style `unsafe-inline`, img/connect/media sources), HSTS (2-year max-age + includeSubDomains + preload), Referrer-Policy (`strict-origin-when-cross-origin`), Permissions-Policy (disables camera/geolocation/microphone/payment/USB), X-Frame-Options (`DENY`). Wrapped with `withSentryConfig()`. `docs/mobile/app-store-readiness-review.md:78` originally flagged as P0-5. | **P0 mitigated** | Baseline security posture for App Review. |
| IOS-B3 | **Complete** | `lib/security/rateLimit.ts` implements `SlidingWindowRateLimiter` class. `lib/security/authPublicRateLimit.ts` provides endpoint-specific limits: sign-in (10/10min per IP+email), password-reset-request (5/15min), password-reset-submit (10/15min), email-verify (10/15min). Client IP via `x-forwarded-for`/`x-real-ip`. Email normalization + token hashing (SHA256). `docs/mobile/app-store-readiness-review.md:86` originally flagged as P1-1. | **P0 mitigated** | Abuse/brute-force protection for auth surfaces. |
| IOS-B4 | **Complete (implementation)** | iOS-safe giving strategy uses `NEXT_PUBLIC_IOS_SAFE_GIVING_STRATEGY=hide_in_ios_native` + `NEXT_PUBLIC_IOS_NATIVE_SHELL=true`. API `/api/parish/giving-shortcut` returns `shortcut: null` in wrapper mode. `docs/mobile/app-store-readiness-review.md:93-95` provides App Review note template. `docs/mobile/ios-c4-app-store-qa-smoke-suite.md:36` embeds same policy wording. | **P1 regression risk** | Must be re-proven in every C4 smoke run; policy violation causes review rejection. |
| IOS-B5 | **Partial** | `docs/mobile/app-store-connect-metadata.md` defines canonical URLs (support, privacy, terms, deletion reference). `lib/mobile/appStoreMetadata.ts` codifies `support@paxora.app` + URL builder. `components/profile/DeleteAccountCard.tsx` references `APP_STORE_SUPPORT_EMAIL` and `APP_STORE_PATHS`. **However:** URLs use `<public-site-domain>` placeholder — production domain not finalized. Final legal sign-off not recorded. | **P0** | Blocks ASC legal field entry with confidence. Review rejection if URLs 404 or mismatch. |

### Epic C — iOS Product Quality & Reliability

| Story | Status | Evidence Source | Risk | Dependency Impact |
|---|---|---|---|---|
| IOS-C1 | **Partial** | Vendored `@sentry/nextjs` in `vendor/sentry-nextjs/` (referenced via `file:` protocol in `package.json:29`). `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` exist with DSN/env/release config. `lib/monitoring/sentry-shell-context.ts` provides `getClientShellContext()`/`getServerShellContext()` + Sentry tag application. `app/global-error.tsx` calls `Sentry.captureException()`. `docs/mobile/ios-c1-sentry-monitoring.md` documents verification checklist + rollback. **However:** no TestFlight-tagged event evidence attached. DSN env vars not confirmed deployed. | **P1** | Blind to iOS-specific crashes during TestFlight/production. |
| IOS-C2 | **Partial** | `docs/mobile/ios-c2-push-behavior-matrix.md` defines 3 runtime modes with expected outcomes, test steps, and evidence templates. Supported mode decision: installed iOS PWA (standalone). Native wrapper = unsupported for push guarantee. `components/pwa/EngagementPrompts.tsx` has Capacitor guard (`shellContext.shell === "native_wrapper"` early return). **However:** no executed evidence artifacts (screenshots/videos/logs) attached for any mode. | **P1** | Push expectation ambiguity risk. Missing evidence weakens review notes. |
| IOS-C3 | **Complete (feature), Partial (evidence)** | `server/actions/content-reports.ts` implements `submitContentReport()`, `updateContentReportStatus()`, `listParishContentReports()` with auth + dedup + text normalization. `ContentReport` Prisma model with `OPEN/REVIEWED/DISMISSED` status. Admin route `/admin/reports`. Report buttons on chat messages, announcements, and groups. `docs/mobile/ios-c3-report-content.md` documents QA checklist. **However:** no TestFlight QA evidence screenshots attached. | **P1** | Apple requires UGC moderation affordance. Feature exists; evidence needed for submission packet. |
| IOS-C4 | **Partial** | `docs/mobile/ios-c4-app-store-qa-smoke-suite.md` defines 6-area smoke matrix (auth, onboarding, tasks, events, chat upload, giving behavior) with detailed steps + pass/fail rubric + evidence template. `scripts/mobile/generate-ios-c4-evidence-template.sh` exists. `package.json:23` has `mobile:ios:c4:evidence` alias. `docs/pilot-runbook.md:85` links C4 for iOS extension. **However:** no completed dated PASS run artifact exists in repo. | **P1** | Hard gate for D3 release go/no-go. Cannot promote to production without PASS evidence. |
| IOS-C5 | **Partial** | `docs/PRODUCT_ROADMAP.md:448` lists R2 env naming normalization. `.env.example` defines `CLOUDFLARE_R2_*` keys. `docs/pilot-runbook.md:21-28` lists storage env vars. `docs/mobile/app-store-readiness-review.md:105` flagged as P2-5. **However:** no explicit closure artifact declaring completed normalization audit or doc/code alignment proof. | **P1** | Ops misconfiguration risk during deployment. Low severity but untidy. |

### Epic D — App Store Operations

| Story | Status | Evidence Source | Risk | Dependency Impact |
|---|---|---|---|---|
| IOS-D1 | **Partial** | `docs/mobile/ios-d1-app-store-connect-metadata-pack.md` provides copy-ready: app name/subtitle/description, keywords, category recommendation (Social Networking/Productivity), age rating answers, privacy nutrition labels, App Review notes template, IOS-B5 canonical values reuse, ASC field mapping table, pre-submission checklist. **However:** `<public-site-domain>` placeholder in URLs. Test account credentials placeholder. Marketing URL pending. | **P1** | Blocks ASC metadata entry. All text is authored; needs production value substitution + legal approval stamp. |
| IOS-D2 | **Partial** | `docs/mobile/ios-d2-screenshot-pipeline.md` defines: required ASC classes (6.7" 1290x2796, 6.5" 1242x2688), 5-screenshot capture matrix (SS-01..SS-05), artifact naming, operator workflow, QA checklist template, failure triage. `scripts/mobile/generate-ios-d2-screenshot-template.sh` exists. **However:** no completed screenshot set. Requires macOS + Xcode + generated ios/ project (A1 dependency). | **P1** | Blocks ASC media upload. Cannot submit without required screenshots. |
| IOS-D3 | **Partial** | `docs/mobile/ios-d3-testflight-to-production-runbook.md` defines: 5-phase release process, role matrix, precondition checklist, TestFlight validation + sign-off collection, promotion decision, post-release monitoring, rollback playbook (triggers + ordered actions + exit criteria), hotfix workflow + minimal regression checklist, release record template. `docs/pilot-runbook.md:87` links D3. **However:** no executed dry-run record. All phase items are `TODO` status. | **P1** | Blocks operational launch confidence. Runbook is authored but unvalidated. |
| IOS-D4 | **Complete (lane), Partial (native coverage)** | `.github/workflows/ios-build-validation.yml` exists: triggers on PR/push/dispatch, runs on `ubuntu-latest`, installs deps, detects Sentry for conditional typecheck/test, runs `mobile:ios:pipeline`, generates artifact bundle (`run-metadata.txt`, pipeline log, ios-app-project.tgz, capacitor config snapshot), uploads with 14-day retention. `docs/mobile/ios-d4-ci-build-validation.md` documents operator workflow. **However:** native `xcodebuild` archive validation is explicitly skipped on ubuntu. No complementary macOS lane exists. | **P1** | CI evidence exists for wrapper asset sync. Full submission confidence requires macOS native build proof. |

---

## 3) Blockers & Risks

### Critical blockers by launch gate

#### Apple Developer account setup
- **No P0 engineering blocker.** Account creation is administrative (organization enrollment, team ID assignment, payment). Can proceed immediately in parallel with engineering work.

#### TestFlight readiness (P0 blockers)
| Blocker | Source | Why it blocks |
|---|---|---|
| IOS-A1: `ios/` project not generated, Capacitor packages not installed | `ios/` contains only `.gitkeep`; `package.json` lacks `@capacitor/*` | No Xcode project = no build = no TestFlight upload |
| IOS-A2: Identity script unvalidated | `scripts/mobile/configure-ios-identity.sh` targets nonexistent `ios/App/App.xcodeproj` | Cannot confirm bundle ID, version, build number, or signing team in real project |
| IOS-A4: Brand-pack assets missing + no asset catalog | `assets/brand/ios/` has only README; `ios/App/App/Assets.xcassets/` does not exist | App Store requires 1024x1024 icon; TestFlight build needs valid icon |
| IOS-B5: Legal URLs use placeholders | `docs/mobile/app-store-connect-metadata.md:7-13` uses `<public-site-domain>` | App Review will reject if support/privacy/terms URLs 404 |

#### App Store submission readiness (additional blockers beyond TestFlight)
| Blocker | Source | Why it blocks |
|---|---|---|
| IOS-C4: No completed QA smoke PASS | No dated artifact in `artifacts/ios-c4/` | D3 release go/no-go requires linked C4 evidence |
| IOS-D1: Metadata pack has placeholder values | `docs/mobile/ios-d1-app-store-connect-metadata-pack.md:40-42` | Cannot enter final values in ASC |
| IOS-D2: No screenshots captured | No files in expected `artifacts/ios-d2/` structure | ASC requires screenshots for both 6.7" and 6.5" classes |
| IOS-D3: No dry-run release record | All phase items `TODO` in runbook | No operational proof of promotion/rollback path |
| IOS-D4: No macOS native archive evidence | `.github/workflows/ios-build-validation.yml:72-73` explicitly skips xcodebuild | Submission requires signed IPA/archive from Xcode |

### Policy-sensitive validation checks

| Policy Area | Current State | Verified In | Risk Level |
|---|---|---|---|
| **Chat media access control** | Session + parish scope + channel/group membership enforced before serving media. Signed R2 URLs with 10-min expiry. | `app/api/chat/images/[...key]/route.ts` | **P0 mitigated** — code-verified |
| **Security headers / rate limits** | CSP, HSTS (2yr), X-Frame-Options (DENY), Permissions-Policy, Referrer-Policy applied globally. Sliding-window rate limits on sign-in/reset/verify endpoints. | `next.config.mjs` (headers config), `lib/security/rateLimit.ts`, `lib/security/authPublicRateLimit.ts` | **P0 mitigated** — code-verified |
| **Giving shortcut in iOS native wrapper** | Env-flag strategy suppresses giving shortcut rendering when `NEXT_PUBLIC_IOS_NATIVE_SHELL=true` + `NEXT_PUBLIC_IOS_SAFE_GIVING_STRATEGY=hide_in_ios_native`. API returns `shortcut: null`. | `docs/mobile/ios-c4-app-store-qa-smoke-suite.md:36`, `docs/mobile/app-store-readiness-review.md:93-95` | **P1 regression risk** — must be proven per build |
| **Account deletion discoverability** | Two-step flow in `DeleteAccountCard.tsx` (button + type "DELETE"). References `APP_STORE_SUPPORT_EMAIL` (`support@paxora.app`). Privacy/terms pages linked. ASC metadata pack includes deletion instructions. Within 2 taps from Profile. | `components/profile/DeleteAccountCard.tsx`, `docs/mobile/app-store-connect-metadata.md:22-30`, `docs/mobile/ios-d1-app-store-connect-metadata-pack.md:44` | **P1** — wording aligned, needs final legal URL lock |
| **Push behavior by runtime mode** | Matrix defines 3 modes: native wrapper (unsupported for push guarantee, prompts suppressed), installed PWA (supported, official launch mode), Safari tab (partial/not supported). Capacitor guard in `EngagementPrompts.tsx` prevents A2HS prompts in wrapper. | `docs/mobile/ios-c2-push-behavior-matrix.md`, `components/pwa/EngagementPrompts.tsx` (native_wrapper early return) | **P1** — logic correct, execution evidence missing |

---

## 4) Readiness Gates

### Gate 1: Apple Developer account setup
- **Decision: READY**
- **Basis:** Account creation/enrollment is an administrative step (organization verification, payment, team ID assignment). No engineering artifact from Epics A–D is a prerequisite. Starting now creates lead time for Apple's organization review process (can take days to weeks).

### Gate 2: TestFlight build/upload
- **Decision: NOT_READY**
- **Unresolved P0 blockers:**
  - IOS-A1: No generated `ios/` project; Capacitor packages not installed
  - IOS-A2: Identity script unvalidated against real Xcode project files
  - IOS-A4: Brand-pack source PNGs missing; asset catalog not generated
  - IOS-B5: Legal metadata URLs not finalized to production domain
- **Practical gate blockers (P1):**
  - IOS-C4: No completed PASS evidence for candidate build
  - IOS-C1: Sentry DSN not confirmed deployed for TestFlight monitoring

### Gate 3: App Store submission
- **Decision: NOT_READY**
- **Requires:** All Gate 2 blockers resolved, plus:
  - IOS-D1: Metadata pack production values locked + legal approved
  - IOS-D2: Screenshot set captured on required device classes
  - IOS-D3: Dry-run release record completed with sign-offs
  - IOS-D4: Complementary macOS native archive/signing validation
  - IOS-C2: Push behavior evidence artifacts attached
  - IOS-C3: Content report QA evidence for submission packet

---

## 5) Definition of Done (DoD) Comparison

Per `docs/PRODUCT_ROADMAP.md:483-489`, a mobile story is Done when:

| DoD Criterion | Assessment by Epic |
|---|---|
| **1. Code/config/docs merged and linked in PR** | **Epic A:** A1/A2/A4 have scripts+docs but not functional output (ios/ project absent). A3 fully merged. **Epic B:** B1-B4 have code merged. B5 has docs but placeholder values. **Epic C:** C1/C3 have code merged. C2/C4/C5 have docs only. **Epic D:** D1-D3 have docs. D4 has workflow merged. |
| **2. Security/privacy implications reviewed** | **Epic B:** B1 (media auth), B2 (headers), B3 (rate limiting) all code-reviewed and verified. B4 (giving strategy) documented with review note template. **Other epics:** No formal security review artifacts attached beyond code inspection. |
| **3. QA evidence attached (screenshots/video + test steps)** | **Not met for any story.** No dated QA evidence artifacts exist in the repository for any IOS-* story. C4 smoke framework exists but no PASS run. C2 matrix framework exists but no execution. D2 screenshot pipeline exists but no captures. |
| **4. Runbook updated** | **Partially met.** `docs/pilot-runbook.md:84-91` cross-references C4, D2, D3, D4 mobile docs. But these are forward references to frameworks, not proof of operational execution. |
| **5. Rollback path documented** | **Met for D3 + C1.** `docs/mobile/ios-d3-testflight-to-production-runbook.md:115-148` has explicit rollback playbook with triggers, ordered actions, exit criteria. `docs/mobile/ios-c1-sentry-monitoring.md:59-61` has fast-disable rollback. C2 has mitigation steps. **Not validated** through dry-run execution. |

**DoD Summary:** The project has strong documentation and code coverage for DoD criteria 1, 2, 4, 5 but **criterion 3 (QA evidence) is universally unmet**. No story can be marked fully Done by the project's own definition until execution evidence is captured and linked.

---

## 6) Action Plan (Prioritized)

### Must do now — P0 (blocks TestFlight)

| # | Action | Owner | Effort | Depends On |
|---|---|---|---|---|
| P0-1 | **Close IOS-A1:** Install Capacitor packages (`@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`) in a network-enabled environment, run bootstrap script, generate `ios/App` project, verify `mobile:ios:pipeline` completes successfully, commit `package.json` changes + ios/ scaffold. | Eng | M | Network-enabled env with npm registry access |
| P0-2 | **Close IOS-A2:** Run `npm run mobile:ios:identity` against generated ios/ project. Verify via PlistBuddy that bundle ID = `com.paxora.parishcenter`, display name, version, build number are set. Confirm `DEVELOPMENT_TEAM` placeholder documented for local setup. | Eng | S | P0-1 |
| P0-3 | **Close IOS-A4:** Obtain approved brand-pack PNGs (9 icon sizes + splash variants), commit to `assets/brand/ios/`, run `npm run mobile:ios:assets`, verify AppIcon.appiconset in Xcode. | Product + Design + Eng | S–M | P0-1 + brand design deliverable |
| P0-4 | **Close IOS-B5:** Finalize production public domain. Replace all `<public-site-domain>` placeholders in `docs/mobile/app-store-connect-metadata.md` and `docs/mobile/ios-d1-app-store-connect-metadata-pack.md`. Update `lib/mobile/appStoreMetadata.ts` if domain routing changes. Obtain legal sign-off and record it. | Product + Legal | S | Production domain decision |
| P0-5 | **Correct IOS-A1 doc status:** Update `docs/mobile/ios-a1-implementation.md:3` from "COMPLETED" to "PARTIAL" to match repo reality. Prevents false confidence in status tracking. | Eng | S | None |

### Before first submission — P1

| # | Action | Owner | Effort | Depends On |
|---|---|---|---|---|
| P1-1 | **Execute IOS-C4 smoke:** Run full 6-area smoke against candidate TestFlight build. Capture evidence per template. Attach dated PASS artifact to `artifacts/ios-c4/`. Link in release ticket. | QA + Eng | S | P0-1 (TestFlight build exists) |
| P1-2 | **Execute IOS-C2 push matrix:** Run all 3 runtime modes (wrapper, installed PWA, Safari tab). Capture screenshots/videos/logs per evidence template. Attach to `artifacts/ios-c2/`. | QA + Eng | M | P0-1 (wrapper mode testable) |
| P1-3 | **Validate IOS-C1 telemetry:** Deploy with Sentry DSNs configured. Trigger test error in TestFlight build. Confirm tagged event (`app_platform=ios`, `app_shell=native_wrapper`) appears in Sentry dashboard. Capture screenshot. | Eng | S | P0-1 + Sentry DSN configured |
| P1-4 | **Capture IOS-C3 evidence:** Execute report-content QA checklist (chat, announcements, groups, access control, moderation transitions, duplicate handling). Attach screenshots to submission packet. | QA | S | TestFlight build available |
| P1-5 | **Finalize IOS-D1 metadata:** Substitute production URLs, fill test account credentials, get legal/product sign-off. Enter values in ASC and verify. | Product + Legal | S | P0-4 (URLs finalized) |
| P1-6 | **Capture IOS-D2 screenshots:** Boot 6.7" and 6.5" simulators on macOS. Capture SS-01..SS-05. Verify dimensions. Package for ASC upload. | Product + Design + QA | M | P0-1 + P0-3 (project + icons exist) |
| P1-7 | **Execute IOS-D3 dry run:** Walk through Phase 1–5 with candidate build. Fill all checklist items. Record sign-offs. Simulate rollback decision. | Ops + Eng + QA | S | P1-1 (C4 evidence available) |
| P1-8 | **Add macOS CI lane or document manual native build:** Either add macOS runner workflow for xcodebuild archive validation, or document manual native build + signing verification steps with evidence capture template. | Eng/Ops | M | P0-1 (ios/ project exists) |
| P1-9 | **Close IOS-C5:** Audit `.env.example`, `docs/pilot-runbook.md`, and runtime env references for R2 naming consistency. Document alignment or fix mismatches. Mark closure explicitly. | Eng/Ops | S | None |

### Post-initial launch — P2

| # | Action | Owner | Effort | Depends On |
|---|---|---|---|---|
| P2-1 | Automate C4 smoke evidence collection to reduce manual drift between releases. | QA + Eng | M | C4 framework validated |
| P2-2 | Add Fastlane integration for screenshot automation across locale/device matrix. | Eng | M | D2 manual process validated |
| P2-3 | Expand moderation/report-content UX beyond baseline (escalation workflows, auto-flag patterns). | Product + Eng | M | C3 baseline stable |
| P2-4 | Mature release metrics/alerting runbooks for crash-rate trend analysis and SLA tracking. | Ops + Eng | M | C1 telemetry producing data |
| P2-5 | Add localized App Store listing content (UK, potentially ES) for expanded market reach. | Product + i18n | M | D1 en-US listing approved |

---

## 7) Final Verdict

| Gate | Decision |
|---|---|
| **APPLE_DEVELOPER_ACCOUNT** | **READY** |
| **TESTFLIGHT** | **NOT_READY** |
| **APP_STORE_SUBMISSION** | **NOT_READY** |

**Justification:** The Apple Developer account can and should be created immediately — it is an administrative enrollment step with no dependency on Epics A–D completion, and Apple's organization verification process benefits from early initiation. TestFlight readiness is blocked by four P0 items: the `ios/` native project has not been generated (A1), the identity configuration has never been validated against real Xcode files (A2), brand-pack assets are not committed (A4), and legal metadata URLs remain placeholder-bound (B5). App Store submission readiness has additional gaps: no QA smoke evidence exists for any story (universal DoD criterion 3 failure), the metadata pack needs production value substitution, no screenshots have been captured, the release runbook has not been dry-run validated, and no macOS native archive/signing proof exists. The underlying web application code is strong — security headers, auth rate limiting, chat media access controls, content reporting, account deletion, Sentry integration, and iOS-safe giving strategy are all implemented. The critical path is: generate the native project (A1) → validate identity/assets (A2/A4) → finalize legal URLs (B5) → execute QA evidence runs (C1–C5) → complete operations evidence (D1–D4). With focused effort on P0-1 through P0-5, the project can progress to TestFlight readiness; the remaining P1 items are execution-oriented and can proceed rapidly once the native foundation is in place.
