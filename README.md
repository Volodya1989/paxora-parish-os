# Paxora Parish OS

## 1. Executive Summary
Paxora Parish OS is a people-serving, shepherd-anchored operating system for parish life. It serves the entire parish community—clergy, staff, volunteers, and lay leaders—by organizing responsibilities around weekly rhythm rather than data administration. It exists to restore clarity, shared responsibility, and calm coordination in parish life. The problem it solves is not a lack of software features, but a lack of weekly follow-through and visible ownership that ordinary church platforms fail to address.

## 2. The Core Problem Paxora Solves
- Weekly overload and diffusion of responsibility.
- Volunteer coordination chaos across many small commitments.
- WhatsApp + Excel + meetings as symptoms of breakdown, not solutions.
- Mental load carried by clergy and a few reliable volunteers.
- Lack of weekly follow-through that quietly erodes ministry health.

## 3. Product Philosophy
- **People-serving, shepherd-anchored design:** the system reflects pastoral care, not administrative control.
- **Rhythm over records:** the week is the main unit; records are supporting evidence, not the goal.
- **Responsibility over reporting:** clarity about who owns what matters more than metrics.
- **Calm over urgency:** no culture of real-time pressure or constant escalation.
- **Structure before AI:** the product must be useful without any AI assistance.

## 4. The 5 Core Screens (V1 Constitution)

### 4.1 This Week (Home)
- **Purpose:** present the week’s commitments and clarity of ownership at a glance.
- **How it serves people:** it shows what matters now without requiring navigation or filtering.
- **How it reduces mental load:** everyone sees the same weekly focus and fewer things are left ambiguous.
- **Deliberately excludes:** future planning beyond the current week, analytics, and performance indicators.

### 4.2 Groups (Ministries & Circles)
- **Purpose:** anchor parish life in real people and their shared commitments.
- **How it serves people:** it makes group responsibilities visible without turning groups into projects.
- **How it reduces mental load:** it replaces scattered lists with a single, calm roster of who belongs where.
- **Deliberately excludes:** complex hierarchy tools, subgroup nesting, and committee administration.

### 4.3 Tasks (Responsibility View)
- **Purpose:** show each person what they own for the week.
- **How it serves people:** it gives a simple, personal view of responsibility without pressure.
- **How it reduces mental load:** unfinished tasks roll forward automatically, avoiding guilt or panic.
- **Deliberately excludes:** due dates as the primary driver, time tracking, or punitive accountability tools.

### 4.4 Calendar (Context Only)
- **Purpose:** provide light context for the week, not a central planning tool.
- **How it serves people:** it offers orientation without pulling them into scheduling complexity.
- **How it reduces mental load:** it limits the calendar to relevant parish rhythm, not full-scale scheduling.
- **Deliberately excludes:** room booking, long-range planning, and granular event management.

### 4.5 Weekly Digest (Quiet Communication)
- **Purpose:** offer a calm weekly summary of what matters.
- **How it serves people:** it allows parish leaders to communicate clarity without flooding channels.
- **How it reduces mental load:** it replaces constant messaging with a single, stable rhythm.
- **Deliberately excludes:** real-time chat, push-notification urgency, and social-media mechanics.

## 5. Anti-Features (What Paxora Will Never Be)
- **No dashboards or analytics views:** clarity is more important than metrics.
- **No sacramental registers:** this is not a system of record for sacraments.
- **No accounting or donations management:** financial administration belongs elsewhere.
- **No real-time chat pressure:** Paxora protects parish life from constant interruptions.
- **No feature bloat:** intentional limitation is part of the product’s identity.
- **No attention-maximizing mechanics:** engagement is not the goal.
- **No committee-driven configuration sprawl:** simplicity is preserved even when it is harder.

## 6. MVP Roadmap
- **Phase 0: Visual validation (mockups)**
  - Produce lightweight screens for the 5 core views.
  - Validate that the week-based flow is intuitive and calming.
- **Phase 1: Clickable prototype (no backend)**
  - Build a navigable prototype with realistic flows.
  - Validate clarity and simplicity with parish users.
- **Phase 2: Deterministic MVP (no AI)**
  - Implement weeks, tasks, groups, and roll-forward logic.
  - Deliver a fully useful product without AI dependency.
- **Phase 3: Optional AI augmentation (assistive only)**
  - Add drafting and summarization tools that can be ignored.
  - Keep every AI action reviewable and reversible.

## 7. AI Strategy (Guardrailed & Subordinate)
- **Appropriate uses:** drafting weekly digests, summarizing task updates, suggesting reminders.
- **Forbidden uses:** deciding what matters, assigning responsibilities, or messaging autonomously.
- **Why Paxora is not AI-first:** the system’s value comes from human clarity and shared rhythm.
- **Why Paxora stays valuable in an AI-saturated world:** it is a calm, bounded system where AI cannot replace pastoral judgment.

## 8. Defensibility & Differentiation
- **Why existing platforms cannot easily copy it:** their models are built around data and admin needs, not weekly responsibility.
- **Architectural moat:** the week-based model is foundational, not an optional filter.
- **Cultural moat:** pastoral sensitivity and boundaries are designed into the product’s limits.
- **Intentional limitation as strength:** by refusing bloat, Paxora protects its core promise.

## 9. Target Parishes & Ideal Users
- Small to mid-size parishes.
- Priest-led, volunteer-heavy communities.
- Liturgical traditions (Catholic, Orthodox, traditional Protestant).
- Communities seeking calm coordination rather than feature power.

## 10. Success Criteria
- **Behavioral signals:** calmer Mondays, fewer emergency meetings, fewer last-minute messages, clearer ownership.
- **After 3 months:** weekly rhythm is stable; volunteers know their responsibilities without repeated reminders.
- **After 6 months:** parish leaders report reduced mental load and fewer coordination crises.
- **After 12 months:** responsibilities are shared across the community with sustained calm.
- **Metrics focus:** clarity, weekly completion consistency, and reduced friction—not engagement metrics.

## 11. Risks & Assumptions
- **Cultural assumptions:** parishes are willing to adopt a weekly rhythm and share responsibility.
- **Not a good fit for:** highly bureaucratic organizations expecting granular reporting or financial management.
- **Risks of misuse:** task policing or over-control that contradicts pastoral intent.
- **Mitigation:** limit features that enable surveillance, reinforce clarity and trust in design.

## 12. Technical Approach & Tooling (Guiding, Not Binding)
- **Frontend & Backend Strategy (V1):** a single Next.js application (App Router), with server components and API routes/server actions providing backend functionality.
- **Rationale:** faster iteration, reduced complexity, and tight coupling between the five core screens and their logic.
- **Backend Philosophy:** deterministic, explainable logic; weeks, tasks, and groups are canonical models; no AI as system-of-record.
- **Data Layer:** relational database (e.g., PostgreSQL or equivalent), optimized for clarity and predictability over cleverness.
- **Authentication:** simple, proven auth suitable for small teams and parish-scale usage.
- **AI Integration Philosophy:** AI is optional and pluggable; it consumes structured data but never owns it; AI outputs must be reviewable and reversible.
- **Future Exit Ramp:** Python/FastAPI services may be introduced later for AI-heavy processing or background jobs without changing Paxora’s identity.
- **Tooling posture:** choices serve the product philosophy and can evolve without redefining Paxora.

## 13. Page-by-Page Feature Guide

### This Week (`/this-week`)
- **Purpose:** provide a calm summary of the current week’s commitments.
- **Key features:**
  - Displays the active week range and label.
  - Shows digest status with a neutral/warning/success badge.
  - Lists tasks and events for the week with concise metadata.
  - Provides quick navigation to the tasks view and digest workspace.

### Tasks (`/tasks`)
- **Purpose:** show weekly tasks assigned to the current user and group.
- **Key features:**
  - Organizes tasks by weekly context rather than dates.
  - Highlights status (open vs. done) in a low-pressure format.
  - Provides actions for creating and updating tasks.

### Groups (`/groups`)
- **Purpose:** list ministry groups and their members.
- **Key features:**
  - Displays all groups with membership counts and quick access.
  - Allows leaders to view responsibilities and members in each group.

### Group Detail (`/groups/[groupId]`)
- **Purpose:** show a single group’s membership and weekly assignments.
- **Key features:**
  - Displays members with role badges (lead vs. member).
  - Lists group tasks for the active week.
  - Links back to the group list for quick navigation.

### Calendar (`/calendar`)
- **Purpose:** present weekly events as light context.
- **Key features:**
  - Shows events in the current week without heavy scheduling controls.
  - Keeps the calendar scoped to parish context.

### Weekly Digest (`/digest`)
- **Purpose:** compose and preview a calm weekly summary.
- **Key features:**
  - Edit and preview weekly digest content side-by-side.
  - Save drafts and publish with clear status indicators.
  - Generate a preview from recent tasks and events.

### Style Preview (`/style-preview`)
- **Purpose:** internal UI kit preview for Direction A tokens.

## 14. Validation Commands
Use these commands to validate UI changes and database workflows before shipping:

### UI validation
- `npm run lint` (lint UI + app code)
- `npm run typecheck` (TypeScript + Prisma client generation)
- `npm run build` (Next.js production build)

### Database validation
- `npm run prisma:migrate` (apply migrations locally)
- `npm run prisma:seed` (seed demo data)
- `npm run test` (integration/unit tests; requires `DATABASE_URL`)
- **Key features:**
  - Visual reference for typography, buttons, and cards.
  - Helpful for verifying design system consistency.

## Local development

### Prerequisites
- Node.js 20+
- PostgreSQL 16+

### Setup
```bash
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev
```

### Sentry setup (IOS-C1)
- Set `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` in deployed environments to enable error capture.
- Optional: set `SENTRY_ENVIRONMENT` / `NEXT_PUBLIC_SENTRY_ENVIRONMENT` and `SENTRY_RELEASE` / `NEXT_PUBLIC_SENTRY_RELEASE` for filtering and release tracking.
- Keep `SENTRY_TRACES_SAMPLE_RATE` and `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` at `0` unless you explicitly want performance tracing.
- If DSNs are unset, Sentry stays disabled and the app continues to run normally.
- Runtime dependency is `@sentry/nextjs` via `vendor/sentry-nextjs` and is expected to forward event envelopes when DSNs are configured.

### Product analytics setup (Roadmap Item 10)
- Required env vars:
  - `NEXT_PUBLIC_ANALYTICS_ENABLED=true`
  - `NEXT_PUBLIC_POSTHOG_KEY=<your project key>`
  - Optional `NEXT_PUBLIC_POSTHOG_HOST` (defaults to `https://us.i.posthog.com`)
- Rollout procedure:
  1. Deploy with `NEXT_PUBLIC_ANALYTICS_ENABLED=false` to verify no behavior changes.
  2. Set `NEXT_PUBLIC_POSTHOG_KEY`, then flip `NEXT_PUBLIC_ANALYTICS_ENABLED=true`.
  3. Validate events in PostHog live stream.
- Disable procedure (no redeploy risk): set `NEXT_PUBLIC_ANALYTICS_ENABLED=false` in runtime environment and restart the app.
- Initial events tracked:
  - `page_viewed` (route changes)
  - `rsvp_submitted`
  - `task_completed`
  - `chat_message_sent`
- Safety defaults: analytics is no-op unless explicitly enabled, and payloads avoid message bodies or other sensitive content.

### Run the app
```bash
npm run dev
```

### Validate locally
```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Product Constitution
- The week is the primary organizing unit, not dates or dashboards.
- Paxora is people-serving and shepherd-anchored, never admin-driven.
- Tasks roll forward and preserve calm, not urgency.
- Only five core screens define V1, with intentional limitation.
- AI is optional, assistive, and always subordinate to human judgment.
- Paxora remains fully useful without AI.
- The system resists bloat to protect clarity and responsibility.
