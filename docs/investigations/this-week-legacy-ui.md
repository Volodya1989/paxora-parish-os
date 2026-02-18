# Investigation: intermittent legacy "This Week" UI rendering

- **Date:** 2026-02-18
- **Phase:** 1 (investigation + safe isolation only)
- **Status:** In progress (instrumented + isolated suspected legacy branch)

## Reported symptom
Users occasionally reopen/refresh the app and see an old/unused This Week layout rather than the intended current layout.

## Reproduction notes observed from current codebase
1. Canonical This Week route exists at `app/[locale]/(app)/this-week/page.tsx` and is configured as dynamic (`force-dynamic`) with `revalidate = 0`.
2. Root app page (`app/[locale]/(app)/page.tsx`) still renders a large This Week-style hero card (`HomeHero`) that visually resembles older This Week UI.
3. If a user lands on `/[locale]` instead of `/[locale]/this-week` (for any reason: reopen, stale tab restore, older bookmark, etc.), they will see the old-style card.

## Files discovered during route/component audit

### Canonical implementation (active)
- `app/[locale]/(app)/this-week/page.tsx`
- `components/this-week/ThisWeekParishionerView.tsx`
- `components/this-week/ThisWeekAdminView.tsx`
- `components/this-week/parishioner/ParishionerHeader.tsx`
- `components/this-week/parishioner/QuickBlocksRow.tsx`
- `components/this-week/parishioner/GroupsSection.tsx`

### Alternate/legacy-looking implementation surface
- `app/[locale]/(app)/page.tsx` (Home route)
- `components/home/home-hero.tsx` (renders old-style This Week card in Home)

### Legacy candidates currently not imported by active page tree
(kept intact in Phase 1; no deletion)
- `components/this-week/ThisWeekHeader.tsx`
- `components/this-week/admin/ThisWeekAdminHero.tsx`
- `components/this-week/admin/EventsPreviewCard.tsx`
- `components/this-week/admin/AnnouncementsPanel.tsx`
- `components/this-week/admin/ServePreviewCard.tsx`
- `components/this-week/parishioner/SectionAnnouncements.tsx`
- `components/this-week/parishioner/SectionSchedule.tsx`
- `components/this-week/parishioner/SectionOpportunities.tsx`
- `components/this-week/parishioner/ParishHubPreview.tsx`

## Routing / cache / hydration checks

### App Router routing
- Only one `this-week/page.tsx` exists under App Router.
- No parallel route or alternate `this-week` page found.
- No dynamic import for This Week implementation found.

### Route segment cache settings
- `app/[locale]/(app)/this-week/page.tsx`: `dynamic = "force-dynamic"`, `revalidate = 0`.
- `app/[locale]/(app)/page.tsx`: also dynamic + `revalidate = 0`.
- This makes ISR stale-cache less likely for page HTML.

### Hydration mismatch risk
- Added client marker in `ParishionerHeader` to log mounted pathname/query.
- Existing header already used a hydration-safe greeting pattern (`useEffect`-set greeting).
- No server/client conditional branch found that swaps to a separate legacy This Week component after mount.

### Service worker/cache layer
- `public/sw.js` does not implement fetch caching of HTML routes.
- SW handles push + notification click only.

## What was changed in Phase 1 (safe isolation)

### 1) Suspicious legacy UI branch disabled (without deletion)
In `app/[locale]/(app)/page.tsx`, the Home `HomeHero` section was wrapped with:

```ts
const __LEGACY_THIS_WEEK_DISABLED__ = true;
```

and gated:

```tsx
{!__LEGACY_THIS_WEEK_DISABLED__ ? <HomeHero ... /> : null}
```

with a required legacy comment block explaining why it is temporarily disabled.

**Why safe:**
- Does not touch canonical `/this-week` route implementation.
- Does not delete code.
- Easy one-line rollback by flipping the guard.

### 2) Temporary instrumentation added
- Server render marker in `app/[locale]/(app)/layout.tsx`.
- Server render marker in `app/[locale]/(app)/this-week/page.tsx`.
- Server render marker in `app/[locale]/(app)/page.tsx` (Home).
- Client mount marker in `components/this-week/parishioner/ParishionerHeader.tsx`.

Markers include route/path context and env/build info where available.

## Root-cause hypothesis (ranked)
1. **Most likely:** Users are intermittently landing on Home (`/[locale]`) which still contains legacy This Week-style card UI, and interpreting it as This Week page regression.
2. **Medium:** Route restoration/bookmark behavior causes `/[locale]` loads in some reopen/refresh flows.
3. **Lower:** SSR/CSR mismatch causing branch swap (no strong evidence found).
4. **Lower:** App Router cache serving stale tree (both pages are force-dynamic + revalidate 0).

## Risks / caveats
- Home page now no longer shows the old This Week hero card while guard is `true`.
- If product still intended that card on Home, this is a temporary behavior change for investigation only.

## Phase 2 recommendations
1. Confirm production telemetry/logs that problematic sessions hit Home route.
2. Decide product intent:
   - If Home should not show legacy This Week card: remove HomeHero legacy section permanently.
   - If Home should remain: redesign card so it cannot be mistaken for This Week page.
3. Remove unused legacy components after validation.
4. Add regression guard test:
   - Ensure `/[locale]/this-week` never renders Home hero section.
   - Optionally redirect `/[locale]` -> `/[locale]/this-week` if that is intended UX.
