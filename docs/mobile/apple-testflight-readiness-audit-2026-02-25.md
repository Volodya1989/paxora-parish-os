# Apple Developer + TestFlight Technical Readiness Audit (2026-02-25)

## Scope and commands run
- `sed -n '1,240p' README.md`
- `cat package.json`
- `sed -n '1,220p' capacitor.config.ts`
- `find ios -maxdepth 3 -type f`
- `sed -n '1,260p' scripts/mobile/bootstrap-capacitor-ios.sh`
- `sed -n '1,260p' scripts/mobile/configure-ios-identity.sh`
- `sed -n '1,260p' scripts/mobile/configure-ios-assets.sh`
- `sed -n '1,240p' docs/mobile/ios-d1-app-store-connect-metadata-pack.md`
- `sed -n '1,240p' docs/mobile/app-store-connect-metadata.md`
- `sed -n '1,260p' docs/mobile/ios-d2-screenshot-pipeline.md`
- `sed -n '1,220p' lib/mobile/appStoreMetadata.ts`
- `sed -n '1,220p' app/[locale]/(marketing)/privacy/page.tsx`
- `sed -n '1,220p' app/[locale]/(marketing)/terms/page.tsx`
- `sed -n '1,220p' app/[locale]/(marketing)/contact/page.tsx`
- `sed -n '1,220p' app/manifest.ts`
- `sed -n '1,220p' server/auth/options.ts`
- `sed -n '1,220p' app/api/parish/giving-shortcut/route.ts`
- `sed -n '1,220p' lib/giving/iosSafeGiving.ts`
- `sed -n '1,220p' app/[locale]/(app)/admin/reports/page.tsx`
- `sed -n '1,220p' components/admin/ContentReportsQueue.tsx`
- `sed -n '1,280p' lib/push/notify.ts`
- `sed -n '1,220p' lib/notifications/chat-membership.ts`
- `sed -n '1,220p' .env.example`
- `sed -n '1,240p' .github/workflows/ios-build-validation.yml`

## Packaging conclusion
- The product is a **web-first Next.js app** with a **planned Capacitor wrapper path**, not yet a fully materialized native iOS project in-repo.
- Evidence:
  - Capacitor config exists and points to live server URL mode (`server.url`) with iOS app identifier/name (`com.paxora.parishcenter`, `Paxora Parish Center App`).
  - Mobile scripts exist for bootstrap, identity, and assets.
  - Current `ios/` directory does not include generated `ios/App` Xcode project files (only `ios/.gitkeep` from repository listing command), and scripts explicitly require generated files before identity/assets can run.

## Key readiness findings

### What is already prepared
- App Store metadata pack exists with app name, short/full description, keywords, categories, age-rating guidance, and App Review notes template.
- Canonical support/legal metadata mapping exists (support URL, privacy URL, terms URL, support email).
- Marketing privacy/terms/contact pages exist and are wired to the metadata constants.
- Account deletion UX and copy exists (Profile flow with `DELETE` confirmation and support contact).
- iOS-safe giving strategy exists (`allow` vs `hide_in_ios_native`) and API returns `shortcut: null` when disabled.
- Content reporting/moderation queue exists (admin/shepherd restricted review page + status transitions).
- Push implementation exists with category-based preferences and privacy-safe chat wording for private groups.
- Security headers are present in Next.js config (CSP, HSTS, Referrer-Policy, Permissions-Policy, X-Frame-Options).
- Environment strategy has explicit iOS wrapper flags and staging/production-style toggles for Sentry and analytics.

### Gaps blocking TestFlight-ready technical posture
1. Generated iOS native project (`ios/App/...`) is missing in repo state, so no Xcode workspace/archive path is currently verifiable.
2. Capacitor dependencies are not declared in `package.json` (`@capacitor/core`, `@capacitor/cli`, `@capacitor/ios` absent), while scripts rely on them.
3. iOS brand-pack source images for app icon/splash are missing (folder only has README placeholders).
4. App Store metadata still uses `<public-site-domain>` placeholders; production URLs are not yet concretized in docs.
5. iOS CI build validation workflow is explicitly disabled (`IOS_BUILD_VALIDATION_ENABLED: "false"`) and runs on Ubuntu copy/sync path, not a macOS archive lane.
6. User blocking feature for UGC safety is not evident in app/server code (reporting exists, blocking not found in audited paths).
7. Push payloads include task/request/event/chat context text; privacy-review policy for lock-screen preview suppression is not codified in repo docs/config.

## GO/NOT YET assessment
- **Open Apple Developer account now:** GO (no repo technical blocker).
- **Proceed to TestFlight submission attempt from current repo state:** NOT YET.
- Status framing: mostly ready with a small number of high-impact repository blockers (native project/dependencies/assets/production metadata).

