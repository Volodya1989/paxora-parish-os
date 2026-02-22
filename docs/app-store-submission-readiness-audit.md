# App Store Submission Readiness Audit (iPhone-first)

## 1) Repo & Distribution Model Discovery
- **Current model: PWA only (not packaged native yet).**
  - Evidence: Next.js app scripts/deps; no Capacitor/Cordova/Expo deps in `package.json`. (`next`, `next-auth`, `react`, `web-push`; no native wrapper packages). 
  - Evidence: PWA manifest + service worker + push registration are implemented.
- **Packaging status:** **UNKNOWN — needs confirmation** for any out-of-repo mobile wrapper project. In this repo, there are no `ios/`, `android/`, `capacitor.config.*`, `app.json`, `expo` files.
- **Build/deploy pipeline and hosting clues:**
  - CI runs Prisma migrate, lint, typecheck, tests, build in GitHub Actions.
  - Build script has Vercel-specific branch detection (`VERCEL`, `VERCEL_ENV`) and migration recovery path.
  - Cloudflare R2 is used for object storage via environment vars and signed URLs.

## 2) App Store Readiness Gate Checklist (iOS first)
### A. Apple review blockers (must-have)
1. **Native wrapper not present**
   - Status: **MISSING**
   - Action: Add minimal Capacitor wrapper (see section 5).
   - Owner: Eng
   - Risk: Cannot submit to App Store.
2. **External giving links may route users to external payment/donation pages**
   - Status: **PARTIAL**
   - Action: For iOS app build, either hide/disable external giving links or route to compliant informational UX; do not present in-app purchase bypass patterns.
   - Owner: Product + Eng + Legal
   - Risk: App Review rejection under payments/digital commerce rules.
3. **App metadata/legal completeness** (support URL/contact email/account deletion wording for App Store Connect)
   - Status: **PARTIAL**
   - Action: Publish support URL and explicit support email in-app + policy pages, add explicit account/data deletion instructions.
   - Owner: Product + Legal
   - Risk: Review delays/rejection for incomplete listing/compliance details.

### B. Security & privacy must-have
1. **Chat image fetch endpoint lacks auth/membership gate**
   - Status: **MISSING**
   - Action: Add session + parish/channel access checks to `app/api/chat/images/[...key]/route.ts` to match avatar route model.
   - Owner: Eng
   - Risk: Potential unauthorized media access.
2. **Security headers (CSP, HSTS, frame-ancestors, etc.) not configured in repo**
   - Status: **MISSING**
   - Action: Add headers in Next config/middleware and verify on production host.
   - Owner: Eng
   - Risk: Increased web attack surface; App Review concern during penetration checks.
3. **Secrets/rotation policy runbook not codified**
   - Status: **PARTIAL**
   - Action: Add ops doc for secret rotation (`NEXTAUTH_SECRET`, R2 keys, VAPID, CRON secret).
   - Owner: Eng/Ops
   - Risk: operational security weakness.

### C. UX / product must-have
1. **Installed-app UX for iPhone wrapper** (offline fallback, no broken browser-only prompts)
   - Status: **PARTIAL**
   - Action: validate PWA prompts/push UX in WKWebView and conditionally disable unsupported prompts.
   - Owner: Eng + Product
   - Risk: poor first-run experience/review feedback.
2. **Moderation/reporting entry points for UGC** (chat/groups/announcements)
   - Status: **PARTIAL**
   - Action: add "Report content" affordance and admin review queue for abusive content.
   - Owner: Product + Eng
   - Risk: trust/safety review concerns.

### D. Performance / stability must-have
1. **Crash/error monitoring not implemented**
   - Status: **MISSING**
   - Action: add Sentry (or equivalent) for web+wrapper runtime errors.
   - Owner: Eng
   - Risk: blind operations during pilot rollout.
2. **Release environment matrix** (dev/qa/prod) not clearly codified
   - Status: **UNKNOWN — needs confirmation**
   - Action: document env separation and promotion process.
   - Owner: Eng/Ops
   - Risk: config drift and release regressions.

### E. Operational / support must-have
1. **Support runbook exists but env key names are inconsistent for R2**
   - Status: **PARTIAL**
   - Action: align `docs/pilot-runbook.md` R2 variable names with `.env.example` + code.
   - Owner: Eng/Ops
   - Risk: misconfigured production storage.
2. **Store submission artifacts pipeline missing**
   - Status: **MISSING**
   - Action: add checklist/scripts for screenshots, app icons, release notes, privacy answers.
   - Owner: Product + Eng
   - Risk: submission churn and delays.

## 3) Security & Privacy Audit (repo-based)
- **Authentication/session security:** NextAuth credentials-only provider with bcrypt password verification; JWT sessions; password reset tokens are hashed and expiring; email verification flow exists. **Minimal change:** enforce stronger password policy and add brute-force protection on sign-in/reset endpoints.
- **Transport security:** no explicit CSP/HSTS/security headers in repo config. **Minimal change:** add baseline headers in Next config and verify at edge.
- **Data at rest/secrets:** Prisma + Postgres; secrets from env; R2 signing uses access key + secret. **UNKNOWN — needs confirmation** for DB encryption-at-rest and KMS rotation policies (cloud-side).
- **R2/object storage controls:** uploads use short-lived signed PUT URLs; avatars are access-controlled via API; chat image fetch route currently lacks auth checks.
- **PII handling/data minimization:** User model stores email/name and profile date fields; request details JSON may contain sensitive pastoral info; logs include email/delivery records.
- **Logging/analytics:** console logging and delivery attempt records exist; no centralized crash analytics found.
- **Rate limiting/abuse prevention:** no generic rate-limit middleware found for auth/public APIs.
- **Admin/clergy privileges & audit logging:** role checks exist and audit log model/actions exist for select critical mutations and impersonation; coverage appears partial across all admin actions.
- **Vulnerability hygiene:** CI runs lint/typecheck/test/build; no CodeQL/dependabot/secret scanning workflows found in `.github`.

## 4) Legal/Compliance for App Store
- **Privacy Policy:** implemented route.
- **Terms:** implemented route.
- **Support URL/contact email/data deletion instructions:** addressed via IOS-B5 updates on in-app contact/legal/deletion surfaces and metadata handoff doc (`docs/mobile/app-store-connect-metadata.md`).
- **Sign in with Apple requirement:** likely **NOT REQUIRED** if only first-party credentials login is offered (no Google/Facebook/etc. in auth providers). **UNKNOWN — needs legal confirmation for final interpretation.**
- **In-app purchases/donations:** giving shortcut can open external links; high Apple policy risk if used to bypass IAP categories.
- **Content moderation/reporting:** role moderation exists, but explicit user-facing reporting/appeals flow appears missing.

## 5) Native Wrapper Requirements (if packaging needed)
- **Chosen smallest viable path: Option 1 — Capacitor wrapper.**
- Why: existing app is already production PWA/Next.js; Capacitor minimizes rewrite.

### Minimal implementation plan (do not execute yet)
1. Add deps: `@capacitor/core @capacitor/cli @capacitor/ios @capacitor/android`.
2. Initialize Capacitor with app id/name and web dir output.
3. Build web app, sync native projects.
4. Configure iOS:
   - Bundle ID, signing team, deployment target.
   - App icon + launch screen assets.
   - ATS exceptions **only if absolutely needed**.
   - Push notifications plan (APNs path for native wrapper if needed; web push in WKWebView has constraints).
5. Configure Android later:
   - Package name, keystore signing, adaptive icons.
   - Decide Capacitor push strategy vs web push fallback.
6. Add store metadata pipeline and release checklist automation.

## 6) App Identity & Assets Audit
- **App name usage:** "Paxora Parish Center App" appears in root metadata and PWA manifest.
- **Icons/splash:** web icons and apple-touch icons exist; no native asset catalogs yet.
- **Screenshots pipeline:** **MISSING** in repo.
- **Localization:** English/Ukrainian active; Spanish scaffold exists in catalog but not enabled runtime.
- **Accessibility basics:** presence of semantic labels in key controls (e.g., Giving button aria-label), but no dedicated accessibility audit pipeline found.

## 7) Testing & Release Engineering
- **Coverage:** substantial unit/integration test suite and CI gates (lint/typecheck/test/build).
- **Build reproducibility:** build script includes Prisma migrations and Vercel branch handling; environment requirements documented.
- **Crash/error monitoring:** missing centralized tracking.
- **Versioning/release notes:** package version exists; no clear release-note generation process found.

### Minimal per-submission release checklist
1. Run CI green (lint, typecheck, tests, build).
2. Verify production env vars (auth, cron, email, VAPID, R2).
3. Run migration deploy + smoke tests.
4. Validate auth, notifications, uploads, and key UGC flows.
5. Confirm privacy/terms/support URLs and deletion instructions.
6. Validate iOS wrapper build/signing/assets + TestFlight sanity.
7. Prepare App Store metadata, screenshots, age rating, review notes.

## 8) Consolidated Action Table + Next 10 Steps
(See assistant response for prioritized P0/P1/P2 rollout sequencing.)
