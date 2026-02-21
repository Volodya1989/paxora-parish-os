# Paxora Parish OS — Product Roadmap & Next-Steps Plan

**Date:** 2026-02-19
**Basis:** Full repo investigation (code, docs, schema, routes, configs)
**Status:** Post-MVP planning — pilot launch preparation

---

## 1. Current-State Snapshot

### Core Modules (all implemented)

| Module | Route(s) | Key Files | Status |
|--------|----------|-----------|--------|
| **This Week** | `/this-week` | `app/[locale]/(app)/this-week/page.tsx`, `lib/queries/this-week.ts`, `components/this-week/*` | Implemented — primary landing after sign-in |
| **Serve / Tasks** | `/tasks`, `/serve-board` | `server/actions/tasks.ts`, `server/actions/group-tasks.ts`, `lib/queries/tasks.ts`, `components/tasks/*`, `components/serve-board/*` | Implemented — dual surface (personal + board) |
| **Calendar / Events** | `/calendar`, `/events/[id]` | `lib/queries/events.ts`, `components/calendar/CalendarView.tsx`, `components/events/*`, `app/actions/rsvp.ts` | Implemented — week/month, RSVP, recurrence |
| **Groups** | `/groups`, `/groups/[groupId]` | `lib/queries/groups.ts`, `server/actions/groups.ts`, `components/groups/*` | Implemented — create, join, membership, policies |
| **Chat** | Channel views | `server/actions/chat.ts` (104 fns), `lib/queries/chat.ts`, `components/chat/*`, `app/api/chat/*` | Implemented — polling, threads, reactions, polls, attachments, pins |
| **Announcements** | `/announcements` | `server/actions/announcements.ts`, `lib/queries/announcements.ts`, `components/announcements/*` | Implemented — CRUD, publish, audience |
| **Requests** | `/requests`, `/admin/requests` | `server/actions/requests.ts`, `lib/queries/requests.ts`, `components/requests/*` | Implemented — submit, triage, status transitions, notifications |
| **Parish Hub** | `/parish` | `server/actions/parish-hub.ts`, `components/parish-hub/*` | Implemented — admin-configurable link grid |
| **Gratitude Board** | `/gratitude-board` | `components/gratitude/*` | Implemented |
| **Profile / Settings** | `/profile` | `app/actions/profile.ts`, `components/profile/*` | Implemented — preferences, notification toggles |
| **Notifications** | Bell icon + panel | `lib/queries/notifications.ts`, `lib/notifications/notify.ts`, `components/notifications/*` | Implemented — in-app + push, per-category prefs |

### Admin Surfaces

| Surface | Route | Key Files |
|---------|-------|-----------|
| **Admin People** | `/admin/people` | `app/[locale]/(app)/admin/people/page.tsx` |
| **Admin Requests** | `/admin/requests` | `app/[locale]/(app)/admin/requests/page.tsx` |
| **Admin Reliability** | `/admin/reliability` | `app/[locale]/(app)/admin/reliability/page.tsx` — delivery failure visibility |
| **Platform Parishes** | `/platform/parishes` | `app/[locale]/(app)/platform/parishes/page.tsx` — multi-parish management |

### Infrastructure

| Area | Status | Details |
|------|--------|---------|
| **Auth** | Live | NextAuth credentials, session gating via `middleware.ts`, post-login flow, email verify, password reset |
| **Multi-parish** | Live | `parishId` on all major models, `activeParishId` on session, parish switching, platform admin |
| **Email** | Live | Resend provider (`lib/email/providers/resend.ts`), 11 templates in `emails/templates/*`, delivery logging via `DeliveryAttempt` model |
| **Push** | Live | Web Push VAPID (`lib/push/*`), service worker (`public/sw.js`), per-category preferences, subscribe/unsubscribe APIs |
| **i18n** | Live | EN + UK active, ES placeholder; custom provider at `lib/i18n/*`, 855-line message files in `messages/*.json` |
| **Storage** | Live | Cloudflare R2 for chat attachments (`app/api/chat/images/[...key]/route.ts`) |
| **PWA** | Live | `app/manifest.ts`, service worker, A2HS engagement prompts (`components/pwa/EngagementPrompts.tsx`) |
| **Audit Log** | Live | `AuditLog` Prisma model, wired for critical mutations (group/event delete, member removal, role change) |
| **Tests** | Comprehensive | 98 test files, 5,548 lines, integration + unit, Node built-in test runner |
| **Payments** | None | Explicitly out of MVP scope per README ("No accounting or donations management") |
| **Analytics** | None | No Sentry, PostHog, or telemetry found in repo |
| **Marketing site** | None | App is auth-first; `publicPaths` in `middleware.ts` only covers auth routes |

### Env Vars (from `.env.example` + code scan)

```
DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL
RESEND_API_KEY, EMAIL_FROM, EMAIL_FROM_DEFAULT, EMAIL_REPLY_TO
NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_R2_BUCKET, CLOUDFLARE_R2_ACCESS_KEY_ID
CLOUDFLARE_R2_SECRET_ACCESS_KEY, CLOUDFLARE_R2_ENDPOINT, CLOUDFLARE_R2_PUBLIC_URL
CRON_SECRET, NODE_ENV
```

---

## 2. MVP Readiness Summary

### What's Strong

- **Parish-scoped data isolation** — `parishId` on every major model, validated in every server action
- **Complete weekly-rhythm loop** — This Week -> Tasks -> Events -> Announcements -> Chat all functional
- **Auth + access gating** — sign-up, verify email, access request, post-login routing all present
- **Role-based permissions** — ADMIN/SHEPHERD/MEMBER at parish level, COORDINATOR/PARISHIONER at group level
- **Notification dual-channel** — in-app bell + web push with per-category user preferences
- **Email delivery pipeline** — 11 templates, Resend integration, delivery attempt logging + admin reliability page
- **i18n (EN/UK)** — full locale parity across 855 translation keys, locale middleware + cookie persistence
- **Test coverage** — 98 files covering auth, chat, tasks, events, groups, calendar, announcements, i18n
- **Operational docs** — `docs/pilot-runbook.md`, `docs/MVP_READINESS_AUDIT.md`, `docs/mvp-readiness-review.md`

### What's Missing or Weak

| Gap | Severity | Evidence |
|-----|----------|----------|
| No marketing/landing page | High | `middleware.ts` — all non-auth paths require login |
| No error tracking (Sentry etc.) | Medium | Not found in repo |
| No product analytics | Medium | Not found in repo |
| No payments/billing | Low (intentional) | README anti-features |
| Chat is polling-only | Low (MVP ok) | `components/chat/ChatView.tsx` — no WebSocket/SSE |
| Chat image GET lacks membership check | High | `app/api/chat/images/[...key]/route.ts` — validates key prefix only |
| Notification source-of-truth mixed | Medium | `lib/queries/notifications.ts` — stored vs fallback modes |
| `rolloverTasksForWeek` missing perm check | Medium | `server/actions/tasks.ts:791-812` — R7 still open |
| Group chat channel not atomic with group creation | Medium | R4 from audit — still open |
| Hardcoded English strings in some UI components | Medium | Y2 from audit — dialogs, filter drawer, etc. |
| Spanish locale incomplete | Low | `messages/es.json` — 447 lines vs 855 for EN/UK |
| No contact/support form for end users | Medium | Only admin-configurable hub items |
| Serve vs Tasks dual surface confusion | Medium | `/tasks` and `/serve-board` overlap per mvp-readiness-review |

### Audit Items Resolved (Ready for Review)

Per `docs/MVP_READINESS_AUDIT.md`, these blockers have been fixed:
- R1: Cron endpoint auth
- R2: AuditLog model
- R3: listGroups visibility leak
- R5: Push content sanitization
- R6: Soft-delete events
- Y6: Calendar schedule toggle
- Y7: Per-type push preferences
- Y8: Empty states audit

### Audit Items Still Open

- **R4:** Atomic chat channel creation in group transaction
- **R7:** Permission check on `rolloverTasksForWeek`
- **Y1:** Transaction safety on group membership operations
- **Y2:** Hardcoded English strings -> `t()` calls
- **Y3:** Return 404 (not 403) for hidden group detail
- **Y4:** Consolidate duplicate `updateGroupMembership`
- **Y5:** Confirmation modals for destructive actions

---

## 3. Top 10 Prioritized Next Actions

| # | Action | Why | Effort | Where |
|---|--------|-----|--------|-------|
| 1 | **Build public marketing website** | No way for parishes to discover or evaluate the product | L | New `(marketing)` route group — see section 4 |
| 2 | **Protect chat image route with membership auth** | Private group images accessible by URL guessing (P0 security) | S | `app/api/chat/images/[...key]/route.ts` |
| 3 | **Close remaining audit blockers (R4, R7)** | R7 lets any member manipulate serve board; R4 creates groups without chat | S | `server/actions/tasks.ts`, `server/actions/groups.ts` |
| 4 | **Add error tracking (Sentry)** | No visibility into production errors; pilot issues will be invisible | S | `app/[locale]/layout.tsx`, new `lib/sentry.ts` |
| 5 | **Normalize notification read/unread consistency** | Bell count can diverge between stored + fallback modes | M | `lib/queries/notifications.ts`, `lib/notifications/notify.ts` |
| 6 | **Polish onboarding flow copy and sequencing** | New parishioners can stall at access/verify without clear next action | S | `app/[locale]/(auth)/post-login/page.tsx`, `app/[locale]/(gate)/access/page.tsx` |
| 7 | **Finish i18n sweep (hardcoded English -> t())** | Ukrainian users see mixed-language dialogs | M | `components/groups/GroupCreateDialog.tsx`, `components/events/EventForm.tsx`, `components/tasks/TaskCreateDialog.tsx` |
| 8 | **Add confirmation modals for destructive actions** | One-click delete for groups/events/members with no undo | M | All delete flows across modules |
| 9 | **Clarify Serve vs Tasks navigation** | Users confused by two task-oriented surfaces | S | `lib/navigation/routes.ts`, `components/navigation/navItems.ts` |
| 10 | **Add basic product analytics (PostHog or similar)** | No data on feature adoption or pilot engagement | M | New `lib/analytics.ts`, layout integration |

---

## 4. Marketing Website Recommendation

### Approach: Option A — Monorepo with `(marketing)` route group

**Why this approach:**
- The Next.js app already uses `[locale]/(app)` and `[locale]/(auth)` route groups
- Adding `[locale]/(marketing)` follows the established pattern perfectly
- Shared Tailwind config, fonts, and design tokens — consistent branding with zero duplication
- Single Vercel deployment; no multi-repo complexity
- SEO works naturally with Next.js App Router metadata API

### Routing Architecture

```
app/
  [locale]/
    (marketing)/          <-- NEW: public pages, no auth required
      layout.tsx          <-- Marketing shell (public nav + footer)
      page.tsx            <-- Homepage / value prop
      features/page.tsx
      pricing/page.tsx
      about/page.tsx
      demo/page.tsx
      contact/page.tsx
      privacy/page.tsx
      terms/page.tsx
    (auth)/               <-- EXISTING: sign-in, sign-up, etc.
    (app)/                <-- EXISTING: authenticated app
    (gate)/               <-- EXISTING: access gating
```

### Middleware Change

In `middleware.ts`, add marketing paths to `publicPaths`:

```ts
const publicPaths = new Set([
  "/",                  // now serves marketing homepage
  "/features",
  "/pricing",
  "/about",
  "/demo",
  "/contact",
  "/privacy",
  "/terms",
  "/sign-in",
  "/sign-up",
  // ... existing auth paths
]);
```

Currently `/` redirects to `/this-week` for authenticated users (`app/[locale]/(app)/page.tsx`). This needs updating: authenticated users hitting `/` should redirect to `/this-week`; unauthenticated users should see the marketing homepage.

### Content Pages (Minimum Viable)

| Page | Purpose | Key Sections |
|------|---------|-------------|
| **Home** (`/`) | Value proposition | Hero (tagline + screenshot), 3-4 feature highlights, social proof (pilot testimonials later), CTA: "Request pilot access" |
| **Features** (`/features`) | Detailed capability showcase | Sections for: This Week, Serve/Tasks, Groups/Chat, Calendar/Events, Requests, Parish Hub. Use actual app screenshots. |
| **Pricing** (`/pricing`) | Pricing transparency | "Currently in pilot" banner, future tier outlines (Free for small parishes, Pro for larger), "Contact us" CTA |
| **About** (`/about`) | Mission + team | Mission statement (parish-first software), team/founder story, "Built for Ukrainian/English-speaking parishes" angle |
| **Demo** (`/demo`) | Let prospects evaluate | Embedded screenshots/video walkthrough, or Calendly-style "Book a demo" embed |
| **Contact** (`/contact`) | Lead capture | Simple form (name, parish, email, message), store in Prisma `ContactSubmission` model or external form service |
| **Privacy** (`/privacy`) | Legal requirement | Privacy policy content (data handling, GDPR basics for EU parishes if applicable) |
| **Terms** (`/terms`) | Legal requirement | Terms of service |

### Calls-to-Action

- **Primary CTA:** "Request Pilot Access" -> links to `/sign-up` or a dedicated waitlist form
- **Secondary CTA:** "Schedule a Demo" -> links to `/contact` or Calendly embed on `/demo`
- Both CTAs should appear on every marketing page (header + page-specific placement)

### SEO and Meta

- Use Next.js App Router `metadata` export on each `(marketing)` page
- Add `generateMetadata` for dynamic OG titles/descriptions per page
- Create `app/sitemap.ts` (Next.js built-in) covering all marketing routes
- `app/robots.ts` already matched in `middleware.ts` config — add proper directives
- OG images: create a base OG template in `public/og/` or use `next/og` (ImageResponse) for dynamic generation
- Marketing pages should include `<script type="application/ld+json">` for Organization schema

### i18n on Marketing Pages

- **Now:** EN only. Marketing copy needs different tone than in-app strings — store in `messages/en.json` under a `marketing` namespace or separate `messages/marketing-en.json`
- **Later:** UK marketing translations once copy is finalized (avoid translating draft copy)

### Hosting

- Same Vercel deployment as the app — zero additional infrastructure
- No new env vars required for basic marketing pages
- Add `NEXT_PUBLIC_SITE_URL` for absolute OG/meta URLs if not already using `NEXTAUTH_URL`
- For contact form: either Resend (already configured) or external form service

### Implementation Effort

| Task | Effort |
|------|--------|
| `(marketing)` route group + layout (nav/footer) | M (2-3 days) |
| Homepage with hero + feature highlights | M (2-3 days) |
| Features page with module sections | S (1-2 days) |
| Pricing page (pilot mode) | S (1 day) |
| About + mission page | S (1 day) |
| Contact form (basic) | S (1 day) |
| Privacy + Terms (content) | S (1 day) |
| Demo page (screenshots/video) | S (1-2 days) |
| SEO setup (sitemap, robots, OG) | S (1 day) |
| Middleware update for public paths | S (< 1 hour) |
| **Total** | **~2 weeks** |

---

## 5. Roadmap — Three Horizons

### Horizon 1: Pilot-Critical Polish (Next 1-2 Weeks)

| # | Item | Why | What to Change | Where in Repo | Effort | Risk |
|---|------|-----|----------------|---------------|--------|------|
| H1-1 | Protect chat image route with membership check | Private images accessible by URL guessing — security hole | Add session + channel membership validation before streaming | `app/api/chat/images/[...key]/route.ts`, reuse `requireChannelAccess` from `server/actions/chat.ts` | S | High if not fixed |
| H1-2 | Fix R7: permission check on `rolloverTasksForWeek` | Any member can manipulate the serve board across weeks | Add `isParishLeader` check at start of function | `server/actions/tasks.ts:791-812` | S | Medium |
| H1-3 | Fix R4: atomic chat channel creation | Groups can be created without a chat channel | Move `ChatChannel` creation into `createGroupInternal` transaction | `server/actions/groups.ts` | S | Medium |
| H1-4 | Normalize notification read/unread model | Bell count diverges between persisted and fallback sources | Commit to persisted-only path; remove or gate fallback generation | `lib/queries/notifications.ts`, `lib/notifications/notify.ts`, `components/notifications/useNotifications.ts` | M | Medium |
| H1-5 | Add Sentry error tracking | Zero production error visibility during pilot | Install `@sentry/nextjs`, configure in `next.config.js` and layout, add `SENTRY_DSN` env var | `app/[locale]/layout.tsx`, `next.config.js`, new `sentry.*.config.ts` | S | Low |
| H1-6 | Polish onboarding copy + sequencing | New users stall at verify/access/setup screens | Improve CTA text, add "what happens next" guidance, ensure single clear next action per state | `app/[locale]/(auth)/post-login/page.tsx`, `app/[locale]/(gate)/access/page.tsx`, `components/access/AccessGateContent.tsx` | S | Low |
| H1-7 | Clarify Serve vs Tasks navigation labels | Two task surfaces confuse new users | Update nav labels (e.g., "My Tasks" vs "Serve Board"), add helper text + cross-links | `components/navigation/navItems.ts`, `lib/navigation/routes.ts`, empty state components | S | Low |
| H1-8 | Add confirmation modals for destructive actions | One-click irreversible delete for groups/events/members | Add `ConfirmDialog` to delete group, delete event, remove member flows | Y5 items across `components/groups/*`, `components/events/*`, `components/admin/*` | M | Low |
| H1-9 | Fix Y3: hidden group returns 404 not 403 | 403 leaks existence of private groups | Return 404-style "Group not found" for non-members accessing private groups | `server/actions/groups.ts:569-574` | S | Low |
| H1-10 | Verify request visibility role matrix end-to-end | Pastoral requests must never show to wrong audience | Manual + automated test: member/admin/shepherd each see correct requests | `server/actions/requests.ts`, `lib/queries/requests.ts` | S | High if broken |

### Horizon 2: Growth and Adoption (Next 3-6 Weeks)

| # | Item | Why | What to Change | Where in Repo | Effort | Risk |
|---|------|-----|----------------|---------------|--------|------|
| H2-1 | Build public marketing website | Parishes cannot discover or evaluate product | Add `(marketing)` route group per section 4 — homepage, features, pricing, about, contact, privacy, terms | New `app/[locale]/(marketing)/*`, `middleware.ts` publicPaths update | L | Low |
| H2-2 | i18n sweep — replace hardcoded English strings | Ukrainian users see English in create dialogs, filter drawer, header actions | Audit all components for raw English -> `t()` calls; add keys to `messages/en.json` + `messages/uk.json` | `components/groups/GroupCreateDialog.tsx`, `components/events/EventForm.tsx`, `components/tasks/TaskCreateDialog.tsx`, `components/navigation/HeaderActionBar.tsx` | M | Low |
| H2-3 | Consolidate duplicate membership logic | Two code paths for same operation with different permissions | Remove `updateGroupMembership` from `server/actions/groups.ts`, redirect to `app/actions/members.ts` | `server/actions/groups.ts:632-723` | S | Medium |
| H2-4 | Add transaction safety to membership operations | Rapid double-clicks can create duplicate memberships (ugly DB errors) | Wrap check + upsert in `$transaction` | `server/actions/groups.ts` (joinGroup, requestToJoin, acceptInvite) | S | Low |
| H2-5 | Add channel-level chat search | Active channels become hard to navigate without search | New search endpoint + UI component in chat view | New `app/api/chat/[channelId]/search/route.ts`, `components/chat/ChatSearch.tsx`, `lib/queries/chat.ts` | M | Low |
| H2-6 | Better admin invite flow | Onboarding new parish members requires manual steps | Streamline invite -> accept -> active membership path with email invite templates | `emails/templates/parishInvites.ts` (exists), `server/actions/groups.ts`, admin people page | M | Low |
| H2-7 | Contact/support form for end users | No in-app way for parishioners to report issues | Add basic contact form accessible from Parish Hub or profile | New component + API route, or use Resend for submissions | S | Low |
| H2-8 | Add basic product analytics | No data on feature adoption or pilot engagement | Integrate PostHog or similar; track page views, key actions (RSVP, task complete, message sent) | New `lib/analytics.ts`, layout-level provider, `NEXT_PUBLIC_POSTHOG_KEY` env var | M | Low |
| H2-9 | Accessibility pass on pilot-critical flows | Pilot parishes include older parishioners; a11y matters | Keyboard nav, focus order, ARIA labels on auth/home/tasks/requests/chat | Auth pages, header, chat composer, task forms | M | Low |
| H2-10 | SEO setup for marketing pages | Marketing site needs discoverability | Implement `app/sitemap.ts`, `app/robots.ts`, per-page `metadata` exports, OG images | Marketing route group files | S | Low |
| H2-11 | i18n parity CI check | Prevent EN/UK translation key drift | Script that fails CI when message files have mismatched keys | New `scripts/i18n-keys-check.ts`, `package.json` script | S | Low |

### Horizon 3: Monetization and Scale (Next 2-3 Months)

| # | Item | Why | What to Change | Where in Repo | Effort | Risk |
|---|------|-----|----------------|---------------|--------|------|
| H3-1 | Billing/pricing implementation (Stripe) | Monetize beyond pilot; sustain development | Add Stripe integration: customer model, subscription plans, checkout flow, webhook handler, billing portal | New `lib/billing/*`, `app/api/webhooks/stripe/route.ts`, Prisma models for `Subscription`/`Plan`, `STRIPE_SECRET_KEY` etc. | L | Medium |
| H3-2 | Real-time chat (WebSocket or SSE) | Polling creates latency in active conversations (G1 from audit) | Add Pusher/Ably/custom WS layer for message delivery; keep polling as fallback | `components/chat/ChatView.tsx`, new `lib/realtime/*` provider | L | Medium |
| H3-3 | Multi-tenant platform admin hardening | Support managing 10+ parishes without developer help | Bulk operations, parish health dashboard, usage metrics per parish, automated provisioning | `app/[locale]/(app)/platform/*`, new admin dashboard components | M | Low |
| H3-4 | Backup/restore operational runbook | No documented recovery procedure for production data | Write backup script (pg_dump), test restore in staging, document in runbook | New `scripts/backup.sh`, `docs/ops/backup-restore.md` | S | High if missing during incident |
| H3-5 | Spanish locale completion | Expand reach to Spanish-speaking parishes | Complete `messages/es.json` (447 -> 855 lines), add "es" to active locales in `lib/i18n/config.ts` | `messages/es.json`, `lib/i18n/config.ts` | M | Low |
| H3-6 | Chat media optimization pipeline | Images served raw from R2 without resizing/compression | Add image processing (sharp or Cloudflare Image Resizing) for thumbnails + full-size | `app/api/chat/images/[...key]/route.ts`, upload pipeline | M | Low |
| H3-7 | Rate limiting on server actions | Only group creation has rate limit (4/month); no protection against abuse | Add rate limiting middleware for chat messages, requests, auth attempts | New `lib/rate-limit.ts`, apply to `server/actions/chat.ts`, auth routes | M | Medium |
| H3-8 | Content moderation tools | No abuse reporting or message flagging for parish admins | Add "report message" action, flagged-message review queue for leaders | New components in `components/chat/*`, `components/admin/moderation/*` | M | Low |
| H3-9 | Performance optimization for notifications fan-out | `createMany` for notifications grows linearly with parish size | Batch processing, consider async job queue for large parishes | `lib/notifications/notify.ts` | M | Low |
| H3-10 | Advanced parish admin dashboard | Leaders need visibility into parish engagement | Parish-level metrics: active members, message volume, event attendance, request resolution times | New `app/[locale]/(app)/admin/dashboard/page.tsx`, `lib/queries/admin-metrics.ts` | L | Low |
| H3-11 | Consolidate permission helpers | `lib/permissions/index.ts` and `lib/authz/membership.ts` overlap | Merge into single module with clear API | `lib/permissions/*`, `lib/authz/*` | S | Medium |
| H3-12 | Eliminate `as any` Prisma casts | 4 instances in groups.ts indicate schema/type drift | Run `prisma generate`, fix type mismatches | `server/actions/groups.ts:165,416,450,482` | S | Low |

---

## 6. Suggested Milestones — Pilot Launch Week-by-Week

### Week 1: Security Hardening + Error Visibility

- [ ] H1-1: Chat image auth check
- [ ] H1-2: rolloverTasksForWeek permission (R7)
- [ ] H1-3: Atomic chat channel creation (R4)
- [ ] H1-5: Sentry integration
- [ ] H1-9: Hidden group 404 (Y3)
- **Milestone:** All known security gaps closed, error tracking live

### Week 2: Notification + Onboarding Polish

- [ ] H1-4: Notification read/unread normalization
- [ ] H1-6: Onboarding copy + CTA sequencing
- [ ] H1-7: Serve vs Tasks nav clarity
- [ ] H1-10: Request visibility role-matrix verification
- **Milestone:** Pilot-ready onboarding and reliable notifications

### Week 3: UX Polish + Destructive Action Safety

- [ ] H1-8: Confirmation modals for destructive actions
- [ ] H2-2: i18n hardcoded English sweep (start)
- [ ] H2-4: Membership transaction safety
- [ ] H2-3: Consolidate duplicate membership logic
- **Milestone:** No data-loss UX risks; i18n sweep underway

### Week 4: Marketing Site Sprint

- [ ] H2-1: Marketing route group + layout + homepage
- [ ] H2-1: Features + pricing + about pages
- [ ] H2-10: SEO setup (sitemap, robots, OG)
- **Milestone:** Public marketing site live

### Week 5: Marketing + Growth Tools

- [ ] H2-1: Contact form, privacy, terms pages
- [ ] H2-7: In-app support/contact mechanism
- [ ] H2-8: PostHog analytics integration
- [ ] H2-11: i18n parity CI check
- **Milestone:** Full marketing site + analytics pipeline

### Week 6: Adoption Features

- [ ] H2-5: Chat search
- [ ] H2-6: Improved admin invite flow
- [ ] H2-9: Accessibility pass
- [ ] H2-2: i18n sweep completion
- **Milestone:** Adoption-ready for second wave of pilot parishes

### Weeks 7-12: Scale and Monetize

- [ ] H3-1: Stripe billing integration
- [ ] H3-2: Real-time chat evaluation/prototype
- [ ] H3-4: Backup/restore runbook
- [ ] H3-5: Spanish locale completion
- [ ] H3-3: Platform admin hardening
- **Milestone:** Revenue-ready, operationally sound

---

## Next Command List

Quick-execute commands to start working on this plan:

```bash
# 1. Close remaining security items (H1-1, H1-2, H1-3)
# Review these files:
#   app/api/chat/images/[...key]/route.ts   -- H1-1: add membership check
#   server/actions/tasks.ts                  -- H1-2: add isParishLeader to rolloverTasksForWeek (~line 791)
#   server/actions/groups.ts                 -- H1-3: add ChatChannel to createGroupInternal transaction

# 2. Add Sentry (H1-5)
#   npm install @sentry/nextjs
#   npx @sentry/wizard@latest -i nextjs

# 3. Marketing site scaffold (H2-1)
#   mkdir -p app/[locale]/(marketing)
#   Create: layout.tsx, page.tsx, features/page.tsx, pricing/page.tsx, etc.
#   Update middleware.ts publicPaths

# 4. Search for remaining hardcoded English (H2-2)
#   grep -rn '"Cancel"' components/ --include="*.tsx" | head -20
#   grep -rn '"Save"' components/ --include="*.tsx" | head -20

# 5. Check open audit items
#   Review docs/MVP_READINESS_AUDIT.md

# 6. Run existing tests to verify current state
#   npm test

# 7. Build to check for issues
#   npm run build
```

---

*This roadmap is based entirely on code, docs, and configuration found in the repo. Items marked "Not found in repo" were confirmed absent through systematic search.*

---

## 11. Mobile App Store Readiness Roadmap (iOS first, Android second)

**Goal:** Ship a minimally invasive native packaging path for current Next.js/PWA experience, pass App Store review on iPhone, then follow with Android Play submission.

### Delivery principles
- Reuse existing web app routes/components/server actions.
- Avoid rewrites; package with Capacitor first.
- Close P0 security/policy items before native submission.

## 11.1 Epic A — iOS Submission Foundation (P0)

| Story ID | Story | Owner | Priority | Dependencies | Estimate |
|---|---|---|---|---|---|
| IOS-A1 | 🔶 **PARTIAL** — Config + script authored; packages not installed, `ios/` project not generated, `webDir` architecture conflict unresolved | Eng | P0 | None | M |
| IOS-A2 | 🔶 **PARTIAL** — Identity script authored + npm alias added; blocked by IOS-A1 (no `ios/` project to configure) | Eng | P0 | IOS-A1 | S |
| IOS-A3 | Build and sync web assets into Capacitor pipeline for reproducible TestFlight builds | Eng | P0 | IOS-A1 | S |
| IOS-A4 | Add iOS icon/launch assets mapped from brand pack | Product + Eng | P0 | IOS-A2 | S |

### Acceptance criteria
- `ios/` project builds on CI/local with documented commands.
- App launches authenticated shell and routes to current web app.
- Version/build bump checklist exists for each submission.

## 11.2 Epic B — App Review Blockers & Policy Compliance (P0)

| Story ID | Story | Owner | Priority | Dependencies | Estimate |
|---|---|---|---|---|---|
| IOS-B1 | Secure chat media proxy with auth + parish/channel membership validation in `app/api/chat/images/[...key]/route.ts` | Eng | P0 | None | S |
| IOS-B2 | Add security headers baseline in `next.config.mjs` (CSP, frame-ancestors, HSTS, referrer-policy, permissions-policy) | Eng | P0 | None | S |
| IOS-B3 | Add auth/public endpoint rate limiting (sign-in/reset/password/email verification) | Eng | P0 | IOS-B2 | M |
| IOS-B4 | Make iOS-safe giving strategy (feature flag to hide or compliant behavior for external donation links) | Product + Legal + Eng | P0 | None | S |
| IOS-B5 | Finalize legal metadata for store: support URL, support email, privacy/terms URL mapping, deletion instructions | Product + Legal | P0 | None | S |

### Acceptance criteria
- Security and policy stories validated in staging with manual QA checklist.
- App Review notes include donation behavior explanation and test credentials.

## 11.3 Epic C — iOS Product Quality & Reliability (P1)

| Story ID | Story | Owner | Priority | Dependencies | Estimate |
|---|---|---|---|---|---|
| IOS-C1 | Integrate Sentry (web + iOS wrapper context) for error/crash visibility | Eng | P1 | IOS-A1 | S |
| IOS-C2 | Validate push notification behavior matrix for iOS wrapper vs installed PWA and document supported mode | Eng | P1 | IOS-A1 | M |
| IOS-C3 | Add explicit in-app “Report content” affordance for chat/announcements/groups | Product + Eng | P1 | IOS-B1 | M |
| IOS-C4 | Add App Store QA smoke suite (auth, onboarding, tasks, events, chat upload, giving shortcut behavior) | QA + Eng | P1 | IOS-B1, IOS-B4 | S |
| IOS-C5 | Normalize R2 env naming in docs/runbook to match runtime env keys | Eng/Ops | P1 | None | S |

### Acceptance criteria
- Error events visible in monitoring from TestFlight build.
- QA checklist passes in TestFlight with tracked evidence screenshots.

## 11.4 Epic D — App Store Operations (P1)

| Story ID | Story | Owner | Priority | Dependencies | Estimate |
|---|---|---|---|---|---|
| IOS-D1 | Create App Store Connect metadata pack (description, keywords, categories, age rating, privacy labels) | Product + Legal | P1 | IOS-B5 | S |
| IOS-D2 | Build screenshot generation/checklist pipeline (iPhone sizes required by ASC) | Product + Design + Eng | P1 | IOS-A4 | M |
| IOS-D3 | Define release runbook for TestFlight → Production including rollback and hotfix path | Ops + Eng | P1 | IOS-C4 | S |
| IOS-D4 | Add CI lane for iOS build validation + artifact upload notes | Eng | P1 | IOS-A3 | M |

### Acceptance criteria
- One dry-run submission completed in TestFlight with complete metadata package.
- Release runbook approved by Eng/Product/Ops.

## 11.5 Epic E — Android Follow-up (P1/P2 after iOS approval)

| Story ID | Story | Owner | Priority | Dependencies | Estimate |
|---|---|---|---|---|---|
| AND-E1 | Generate and configure `android/` project via Capacitor | Eng | P1 | iOS launch complete | S |
| AND-E2 | Configure Android package, signing keystore, versioning, adaptive icons, splash | Eng | P1 | AND-E1 | M |
| AND-E3 | Validate push behavior for Android WebView/Capacitor and define final implementation path | Eng | P1 | AND-E1 | M |
| AND-E4 | Prepare Play Console listing assets and Data Safety form | Product + Legal | P1 | AND-E2 | S |
| AND-E5 | Android QA smoke suite + staged rollout plan (internal, closed, production) | QA + Eng | P2 | AND-E2, AND-E3 | S |

### Acceptance criteria
- Internal testing track available with signed AAB.
- Data Safety and privacy policy mapping accepted by Play Console.

## 11.6 Definition of Done (DoD) for Mobile Submission Stories

A mobile story is **Done** only when:
1. Code/config/docs merged and linked in PR.
2. Security/privacy implications reviewed (if applicable).
3. QA evidence attached (screenshots/video + test steps).
4. Runbook updated (`docs/pilot-runbook.md` or mobile release runbook).
5. Rollback path documented.

## 11.7 Sequenced Milestones

- **Milestone M1 (Week 1):** IOS-A1..A4 complete (wrapper + identity + assets).
- **Milestone M2 (Week 2):** IOS-B1..B5 complete (review blockers/security/legal).
- **Milestone M3 (Week 3):** IOS-C1..C5 complete (reliability + QA + moderation).
- **Milestone M4 (Week 4):** IOS-D1..D4 complete and submit iOS app.
- **Milestone M5 (Post-approval):** AND-E1..E5 for Android rollout.
