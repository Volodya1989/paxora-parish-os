# App Store Readiness Review — Staff Engineer Audit

**Date:** 2026-02-21
**Reviewer:** Staff Eng (automated audit)
**Scope:** IOS-A1, IOS-A2 verification; gap analysis through IOS-D4; fix plan

---

## 1) Verdict: Is IOS-A1 Actually Complete?

**Status: PARTIAL — scaffolding only, not functional**

### Evidence from files

| Claim (from `docs/mobile/ios-a1-implementation.md`) | Repo reality | Pass? |
|---|---|---|
| `capacitor.config.ts` exists with correct `appId`/`appName` | File exists at repo root: `appId: "com.paxora.parishcenter"`, `appName: "Paxora Parish Center"`, `webDir: "out"` | YES |
| `scripts/mobile/bootstrap-capacitor-ios.sh` exists | File exists with `npm install` + `cap init` + `cap add ios` + `cap sync ios` | YES |
| Capacitor packages in `package.json` | **NO** — `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios` are NOT in `package.json` dependencies or devDependencies | **FAIL** |
| `ios/` project generated | **NO** — `ios/` contains only `.gitkeep` (empty placeholder) | **FAIL** |
| `next.config.mjs` has `output: "export"` for static build | **NO** — `next.config.mjs` is `const nextConfig = {}; export default nextConfig;` (empty config) | **FAIL** |
| `out/` web dir exists for Capacitor to sync | **NO** — no `out/` directory; current build produces SSR output, not static export | **FAIL** |

### Missing artifacts

1. **Capacitor npm packages not installed** — bootstrap script was never run.
2. **`ios/` native project not generated** — only `.gitkeep` present.
3. **`output: "export"` not set in `next.config.mjs`** — `capacitor.config.ts` references `webDir: "out"` but Next.js is not configured for static export. This is a fundamental architecture conflict: the app uses server actions, API routes, and Prisma queries that cannot work with `output: "export"`.
4. **No TypeScript import** — `capacitor.config.ts` lacks `import type { CapacitorConfig }` typing.

### Root cause

The bootstrap script was authored but never executed. The implementation doc even acknowledges this: *"If package installation is blocked in CI/dev environment..."*. The story was marked COMPLETED based on file creation, not functional verification.

### Architectural blocker: `webDir: "out"` vs server-rendered app

This is the most critical finding. The app relies heavily on:
- Server actions (`server/actions/*.ts` — dozens of files)
- API routes (`app/api/*`)
- Prisma database queries on the server
- NextAuth session management with server-side callbacks
- Middleware-based auth gating

A static export (`output: "export"`) would break all of these. The correct Capacitor strategy for this app is **live server mode** — the Capacitor shell loads the deployed web URL, not bundled static files. The `capacitor.config.ts` already has `server.url` pointing to a live URL, which is the right approach, but `webDir: "out"` is contradictory and misleading.

**Fix:** Change `webDir` to a minimal placeholder (e.g., `"public"` or a small `dist/` with an index redirect), and ensure the app always loads from the live server URL. Remove any implication of static export from docs.

---

## 2) Verdict: Is IOS-A2 Actually Complete?

**Status: PARTIAL — script exists but cannot be validated**

### Evidence

| Claim | Repo reality | Pass? |
|---|---|---|
| `scripts/mobile/configure-ios-identity.sh` exists | YES — well-structured script using PlistBuddy + perl | YES |
| `package.json` has `mobile:ios:identity` script | YES — `"mobile:ios:identity": "bash scripts/mobile/configure-ios-identity.sh"` | YES |
| Script modifies `ios/App/App.xcodeproj/project.pbxproj` | Script targets this path, but **file does not exist** (ios/ is empty) | **FAIL** |
| Script modifies `ios/App/App/Info.plist` | Script targets this path, but **file does not exist** | **FAIL** |
| Identity was actually configured | **NO** — cannot have been run since ios/ project doesn't exist | **FAIL** |

IOS-A2 depends on IOS-A1 output. Since IOS-A1 never produced the `ios/` project, IOS-A2's script exists but has never been validated against real Xcode project files.

---

## 3) Gap List (Prioritized)

### P0 — Will block App Store submission entirely

| # | Gap | Why it matters | File(s) to modify | Minimal fix |
|---|---|---|---|---|
| P0-1 | **Capacitor architecture mismatch: `webDir: "out"` vs server-rendered app** | App cannot function as static export; Capacitor sync will produce a broken app | `capacitor.config.ts` | Change `webDir` to `"dist-capacitor"`, create minimal `dist-capacitor/index.html` that redirects to live server URL. Remove static export references from docs. |
| P0-2 | **Capacitor packages not in `package.json`** | `npx cap` commands fail without installed packages | `package.json` | Run bootstrap or manually add `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios` |
| P0-3 | **`ios/` project not generated** | No Xcode project = no build = no submission | `ios/` directory | Run `npx cap add ios && npx cap sync ios` after P0-1 fix |
| P0-4 | **Chat image endpoint has no auth** (`app/api/chat/images/[...key]/route.ts`) | Apple reviews for data access controls; any user can fetch any chat image by guessing the key path | `app/api/chat/images/[...key]/route.ts` | Add `getServerSession()` check + parish/channel membership validation |
| P0-5 | **No security headers** in `next.config.mjs` | CSP, HSTS, frame-ancestors missing; Apple may flag during review; web security baseline | `next.config.mjs` | Add `headers()` config with CSP, X-Frame-Options, HSTS, Referrer-Policy, Permissions-Policy |
| P0-6 | **No `DEVELOPMENT_TEAM` or signing config committed** | Cannot build for device or submit without Apple team ID | `capacitor.config.ts` or Xcode project | Document required env var; add to bootstrap script validation |
| P0-7 | **iOS app icon asset catalog missing** | App Store requires 1024x1024 icon in Xcode asset catalog format | `ios/App/App/Assets.xcassets/AppIcon.appiconset/` | Generate from existing 512px icon using `@capacitor/assets` or manual resize |

### P1 — Will likely cause App Review rejection or first-run issues

| # | Gap | Why it matters | File(s) to modify | Minimal fix |
|---|---|---|---|---|
| P1-1 | **No rate limiting on auth endpoints** | Brute-force attacks on `/sign-in`, `/reset-password`, `/verify-email` | `middleware.ts` or new rate-limit middleware | Add token-bucket or sliding-window rate limiter for auth routes |
| P1-2 | **No "Report Content" UI for UGC** | Apple requires user-facing content reporting for apps with user-generated content (chat, groups, announcements) | New component + route handler | Add report button to chat messages, group posts, announcements |
| P1-3 | **Account deletion flow needs App Store-specific wording** | Apple requires clear deletion path discoverable in-app; `DeleteAccountCard.tsx` exists but must match ASC guidelines text | `components/profile/DeleteAccountCard.tsx`, privacy policy page | Verify wording matches Apple's "account deletion" requirement; ensure it's reachable within 2 taps |
| P1-4 | **No crash/error monitoring** | Operating blind on iOS wrapper; TestFlight crashes invisible | `package.json`, new Sentry config | Add `@sentry/nextjs` with iOS context tags |
| P1-5 | **PWA engagement prompts may fire inside Capacitor WebView** | "Add to Home Screen" prompts inside a native app are confusing and may trigger rejection | `components/pwa/EngagementPrompts.tsx` | Add `Capacitor.isNativePlatform()` guard to suppress PWA prompts in native shell |
| P1-6 | **Giving/donation links policy risk** | External payment links can trigger IAP policy rejection | Giving-related components | Add feature flag to hide/disable giving shortcuts in iOS builds |
| P1-7 | **Support email not codified in app** | App Store Connect requires support URL + email; currently only in docs, not exposed as structured metadata | App Store Connect metadata, contact page | **Addressed in IOS-B5**: support email + legal links now present in contact/privacy/terms surfaces and metadata mapping. |

**App Review note template (donation behavior):**
- "In our iOS native shell build, external donation/payment shortcuts are suppressed when `NEXT_PUBLIC_IOS_SAFE_GIVING_STRATEGY=hide_in_ios_native` and `NEXT_PUBLIC_IOS_NATIVE_SHELL=true`. In this mode, `/api/parish/giving-shortcut` returns `shortcut: null` and no giving shortcut is rendered in app headers."

### P2 — Should fix before production but won't block initial review

| # | Gap | Why it matters | File(s) to modify | Minimal fix |
|---|---|---|---|---|
| P2-1 | **No CI lane for iOS builds** | Manual Xcode builds are error-prone and not reproducible | `.github/workflows/` | Add Fastlane or `xcodebuild` CI step |
| P2-2 | **No screenshot pipeline** | App Store requires 6.7" and 6.5" iPhone screenshots minimum | `scripts/mobile/` | Create checklist doc with device sizes; optionally add Fastlane snapshot |
| P2-3 | **Version/build bump process undocumented** | Each TestFlight upload needs unique build number | `docs/mobile/` | Document `CFBundleVersion` increment strategy (CI-based or manual) |
| P2-4 | **App Store Connect metadata not prepared** | Description, keywords, categories, age rating, privacy nutrition labels | `docs/mobile/` | **Partially addressed in IOS-B5** via `docs/mobile/app-store-connect-metadata.md` (legal/support/deletion fields); extend for full listing copy in IOS-D1. |
| P2-5 | **R2 env var naming inconsistency** | Ops confusion during deployment | `.env.example`, `docs/pilot-runbook.md` | Align variable names across docs and code |

---

## 4) IOS-A2 Implementation Blueprint

### Goal
Configure iOS app identity so the Xcode project builds with correct bundle ID, display name, version, build number, and signing team.

### Prerequisites
- P0-1 resolved (Capacitor architecture fix)
- P0-2 resolved (packages installed)
- P0-3 resolved (ios/ project generated)

### Exact changes needed

#### 4a. Fix `capacitor.config.ts`

```diff
- const capacitorConfig = {
+ import type { CapacitorConfig } from "@capacitor/cli";
+
+ const config: CapacitorConfig = {
    appId: "com.paxora.parishcenter",
    appName: "Paxora Parish Center",
-   webDir: "out",
+   webDir: "dist-capacitor",
    server: {
      url: appUrl,
      cleartext: appUrl.startsWith("http://")
    }
  };
+
+ export default config;
```

#### 4b. Create `dist-capacitor/index.html`

Minimal fallback page that redirects to the live server. This satisfies Capacitor's `webDir` requirement while the app loads from `server.url`.

```html
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Loading...</title></head>
<body><p>Loading Paxora Parish Center...</p></body>
</html>
```

#### 4c. Validate bundle identifier

- Format: reverse-DNS, lowercase alpha + dots + hyphens only
- Current value: `com.paxora.parishcenter` — **VALID**
- Must match Apple Developer portal App ID exactly
- Validation command: `echo "com.paxora.parishcenter" | grep -E '^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$'`

#### 4d. Display name

- Current: `Paxora Parish Center` (22 chars)
- App Store limit: 30 chars for display name — **OK**
- Home screen limit: ~13 chars visible — consider `Parish Center` as `CFBundleDisplayName` if truncation is a concern
- Action: Confirm with Product whether to use shorter home screen name

#### 4e. Version/build strategy

| Field | Value | When to bump |
|---|---|---|
| `CFBundleShortVersionString` | `1.0.0` (semver) | Each App Store release |
| `CFBundleVersion` | Integer, starting at `1` | Every TestFlight upload (must be unique and increasing) |

Recommended: use CI build number or `date +%Y%m%d%H%M` for `CFBundleVersion` to avoid manual tracking.

#### 4f. Signing/team/profile handling

- `DEVELOPMENT_TEAM` must be set to the 10-char Apple Team ID from developer.apple.com
- `CODE_SIGN_STYLE = Automatic` is already the default in `configure-ios-identity.sh` — this is correct for initial setup
- For CI/CD, switch to `Manual` with explicit provisioning profile UUID
- Script already handles both cases correctly

#### 4g. Script updates needed in `configure-ios-identity.sh`

1. Add validation that `IOS_BUNDLE_ID` matches reverse-DNS pattern
2. Add validation that `IOS_BUILD_NUMBER` is a positive integer
3. Add `--dry-run` flag for CI validation without modifying files

#### 4h. Docs updates

- Update `docs/mobile/ios-a1-implementation.md` status to `PARTIAL`
- Update `docs/mobile/ios-a2-implementation.md` to note dependency on ios/ project existing
- Add validation commands section

### Acceptance criteria

1. `ios/App/App.xcodeproj/project.pbxproj` contains `PRODUCT_BUNDLE_IDENTIFIER = com.paxora.parishcenter`
2. `ios/App/App/Info.plist` contains correct `CFBundleDisplayName`, `CFBundleShortVersionString`, `CFBundleVersion`
3. `xcodebuild -project ios/App/App.xcodeproj -scheme App -showBuildSettings | grep PRODUCT_BUNDLE_IDENTIFIER` returns `com.paxora.parishcenter`
4. With `DEVELOPMENT_TEAM` set, `xcodebuild -project ios/App/App.xcodeproj -scheme App build` succeeds for simulator
5. `npm run mobile:ios:identity` exits 0 with correct output when ios/ project exists

### Validation commands

```bash
# Verify bundle ID in Xcode project
grep "PRODUCT_BUNDLE_IDENTIFIER" ios/App/App.xcodeproj/project.pbxproj

# Verify Info.plist values
/usr/libexec/PlistBuddy -c "Print :CFBundleDisplayName" ios/App/App/Info.plist
/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" ios/App/App/Info.plist
/usr/libexec/PlistBuddy -c "Print :CFBundleVersion" ios/App/App/Info.plist

# Build for simulator (no signing required)
xcodebuild -workspace ios/App/App.xcworkspace -scheme App -sdk iphonesimulator build

# Verify signing team (if set)
grep "DEVELOPMENT_TEAM" ios/App/App.xcodeproj/project.pbxproj
```

---

## 5) Corrections to Roadmap/Story Statuses

### `docs/PRODUCT_ROADMAP.md` line 416

**Current:**
```
| IOS-A1 | ✅ **COMPLETED** — Add Capacitor to monorepo and generate `ios/` project ...
```

**Should be:**
```
| IOS-A1 | 🔶 **PARTIAL** — Config + script authored; packages not installed, `ios/` project not generated, `webDir` architecture conflict unresolved |
```

### `docs/PRODUCT_ROADMAP.md` line 417

**Current:**
```
| IOS-A2 | ✅ **COMPLETED** — Configure iOS app identity ...
```

**Should be:**
```
| IOS-A2 | 🔶 **PARTIAL** — Identity script authored + npm alias added; blocked by IOS-A1 (no ios/ project to configure) |
```

### `docs/mobile/ios-a1-implementation.md` line 3

**Current:** `Status: **COMPLETED (repo-level scaffolding)**`
**Should be:** `Status: **PARTIAL — config files authored, bootstrap not executed, architecture conflict (webDir vs server-rendered app) unresolved**`

### `docs/mobile/ios-a2-implementation.md` line 3

**Current:** `Status: **COMPLETED (automation + identity config tooling)**`
**Should be:** `Status: **PARTIAL — script authored but blocked by IOS-A1; never validated against real Xcode project files**`

### New status definitions suggested for roadmap

| Label | Meaning |
|---|---|
| ✅ COMPLETED | Code merged, functionally verified, acceptance criteria met |
| 🔶 PARTIAL | Some artifacts exist but story acceptance criteria NOT met |
| ⬜ NOT STARTED | No implementation artifacts exist |
| 🚧 IN PROGRESS | Active development underway |

---

## 6) Immediate Next 10 Actions

| # | Action | Owner | Depends on | Estimated effort |
|---|---|---|---|---|
| 1 | **Fix `capacitor.config.ts`**: change `webDir` to `"dist-capacitor"`, add CapacitorConfig type import, create `dist-capacitor/index.html` placeholder | Eng | — | 30 min |
| 2 | **Update roadmap statuses**: re-label IOS-A1 and IOS-A2 as PARTIAL in `docs/PRODUCT_ROADMAP.md` and both implementation docs | Eng | — | 15 min |
| 3 | **Run bootstrap in network-enabled env**: install Capacitor packages, generate `ios/` project, commit `package.json` changes and ios/ scaffold | Eng | #1 | 1 hour |
| 4 | **Run identity script against real ios/ project**: execute `npm run mobile:ios:identity` and validate output with PlistBuddy commands | Eng | #3 | 30 min |
| 5 | **Add auth to chat image endpoint**: add `getServerSession()` + parish membership check to `app/api/chat/images/[...key]/route.ts` | Eng | — | 1 hour |
| 6 | **Add security headers to `next.config.mjs`**: CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy | Eng | — | 1 hour |
| 7 | **Add Capacitor platform guard to PWA prompts**: wrap `EngagementPrompts.tsx` with `!Capacitor.isNativePlatform()` check | Eng | #3 | 30 min |
| 8 | **Confirm giving/donation link strategy with Product/Legal**: decide hide vs. compliant external link for iOS | Product + Legal | — | Meeting |
| 9 | **Prepare App Store Connect metadata template**: description, keywords, categories, age rating answers, privacy nutrition labels, support URL/email | Product + Legal | — | 2 hours |
| 10 | **Add "Report Content" affordance to chat/groups/announcements**: minimal flag-for-review button with admin notification | Product + Eng | — | 3 hours |

### Parallel track (actions 5, 6, 8, 9, 10 can start immediately alongside 1-4)

---

## Summary

The mobile readiness effort has good documentation and planning, but **IOS-A1 and IOS-A2 are both only partially complete**. The most critical finding is the **architectural mismatch** between `webDir: "out"` (static export) and the server-rendered nature of the app. This must be resolved before any other mobile work proceeds.

Once the architecture is corrected and the bootstrap is actually executed in a network-enabled environment, the remaining IOS-A work (A3, A4) and the B-epic security/policy items become the critical path to App Store submission.

The app itself is mature and well-built — the gap is entirely in the native packaging layer and a handful of security/policy items that Apple will check during review.
