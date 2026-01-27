# STORY / CODEX PROMPT — Bilingual “Skeleton” i18n (EN default + UK optional)

Project: Paxora Parish OS (Next.js App Router)

Goal: Implement a lightweight i18n foundation (English default, Ukrainian optional) without translating everything. Focus on routing + message framework + top-level UI labels only.

---

## WHY
- Cheapest to add early; expensive later when strings are scattered.
- We want bilingual-ready MVP without slowing feature delivery.

---

## SCOPE (MVP “SKELETON” ONLY)

### 1) Add i18n framework + locale routing
- Default locale: `en`
- Optional locale: `uk` (Ukrainian)
- Locale affects UI labels, not user-generated content.

### 2) Translate ONLY
**Primary navigation + top-level routes**
- This Week
- Serve
- Groups
- Calendar
- Announcements
- Profile
- Sign In / Sign Out

**App shell & header/menu labels (existing UI strings)**
- “Paxora Parish OS”
- Week switcher: “This week”, “Next week”, “Week switcher” (screen reader label)
- “+ Add” button
- Add menu: “Add serve item”, “Add event”, “Add group”
- “More” / “MORE” (mobile)
- “Close more menu” (overlay button label)
- “Signing out…”

**Common buttons**
- Save, Cancel, Create, Edit, Delete, Back, Next, Submit, Close

**Common empty states**
- No tasks yet
- No groups yet
- Nothing scheduled
- No announcements yet

**Common statuses/labels**
- Private / Public
- Draft / Published
- To Do / In Progress / Done (if present)
- Loading
- Error

### 3) Locale persistence + language toggle
- Store locale via cookie (and optionally persist to user profile if a `UserSettings` table already exists; avoid schema changes if not needed).
- Provide a simple language switcher in the top app shell (header or user menu).
- Switching should:
  - Update cookie immediately
  - Redirect to the same page with new locale prefix
  - Preserve query params

### 4) Explicitly DO NOT translate (MVP constraint)
- User-generated text: announcements content, task titles/descriptions, chat messages, group names, comments.
- Email templates, admin forms deep copy, and long content pages (defer).

---

## NON-GOALS
- No auto-translation.
- No translating DB content.
- No full coverage across every single string; only the “core UI surface”.

---

## TECH CHOICES (pick best fit for Next.js App Router)
- Use `next-intl` (preferred) OR `next-international` / built-in patterns if already present.
- Must work with Server Components + Client Components.
- Must not break existing routes or auth flows.

---

## IMPLEMENTATION REQUIREMENTS

### A) Routing
- Add locale-prefixed routes using App Router groups:
  - Example: `app/[locale]/(app)` and `app/[locale]/(auth)`
  - Keep existing structure as much as possible
- Ensure `/` redirects to `/en` (or `/en/this-week` if you have a landing rule).
- Middleware:
  - Detect locale from cookie first
  - Then from `Accept-Language`
  - Else fallback to `en`
  - Rewrite/redirect accordingly
- Ensure static assets, API routes, NextAuth routes, and webhooks are NOT locale-prefixed.
- Update any server-side redirects or pathname logic that currently assumes unprefixed routes (e.g., redirect targets in `app/(app)/layout.tsx` and title logic like `getPageTitle` in `components/header/headerUtils.ts`).

### B) Translation files
- Create message dictionaries:
  - `messages/en.json`
  - `messages/uk.json`
- Organize keys by domain:
  - `nav.*`, `buttons.*`, `empty.*`, `common.*`, `auth.*`, `tasks.*`, `groups.*`, `calendar.*`, `announcements.*`, `header.*`, `menu.*`
- Provide Ukrainian translations for the keys above (keep them short and UI-friendly).

### C) App integration (minimal invasive)
- Add a `t()` helper/hook for Client components and a server equivalent for Server components.
- Update only the following “high traffic” UI areas to use translations:
  - App shell / sidebar / header navigation
  - Page headings for This Week, Groups, Serve, Calendar, Announcements, Profile
  - Common buttons + empty-state components used across pages
  - Any shared status chips/badges (Private/Public etc.)
- Avoid touching every component; only shared primitives + main nav + key pages.

### D) Language toggle UX
- Add `LanguageSwitcher` component:
  - Options: EN / УК
  - Accessible, minimal UI
  - Works on mobile
- On select:
  - set cookie `paxora_locale` (or `NEXT_LOCALE` if using next-intl defaults)
  - navigate to same route under new locale
- Place it in:
  - Header user menu OR sidebar footer
- Add tests for switching behavior.

### E) Testing
- Unit tests:
  - Language switcher renders and changes locale
  - Translation function returns correct strings
  - Extend existing navigation/header tests where applicable (e.g., `tests/unit/nav-tabs.test.ts`, `tests/unit/nav-sidebar.test.ts`, `tests/unit/header-actions.test.ts`)
- Integration tests:
  - Middleware redirects `/` -> `/en` (or cookie-selected locale)
  - Visiting `/uk/...` renders Ukrainian nav labels
  - Add in `tests/integration/` to match existing structure
- Ensure tests are deterministic (no reliance on system locale).

### F) Guardrails / quality
- Type-safe translation keys if possible (optional).
- Provide a fallback mechanism (missing key -> English).
- Log missing keys in dev only.
- Ensure no hydration mismatch (server/client locale alignment).

---

## FILES / AREAS LIKELY TO TOUCH (adjust to actual repo structure)
- `middleware.ts`
- `app/layout.tsx`, `app/(app)/layout.tsx`, `app/(auth)/*`
- `components/navigation/*`, `components/header/*`
- `components/ui/*` shared buttons/empty-states if they contain hardcoded text
- `lib/i18n/*` (create)
- `messages/en.json`, `messages/uk.json`
- Tests: `tests/unit/*`, `tests/integration/*`

---

## ACCEPTANCE CRITERIA
- App supports `/en/*` and `/uk/*` routes; English is default.
- Locale is selected from cookie and can be changed via UI toggle.
- Nav + main headings + common buttons + empty states + header/menu labels are translated for both locales.
- User-generated content remains unchanged (no translation attempt).
- No broken API/auth routes and no broken deep links.
- Tests pass and routing behavior is stable.

---

## DELIVERABLE
- PR with i18n foundation + minimal translated surface + toggle + middleware routing + tests.
- Keep changes minimal and additive; avoid refactors unrelated to i18n.
