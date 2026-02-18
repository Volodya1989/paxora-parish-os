# Investigation: intermittent legacy "This Week" UI rendering

- **Date:** 2026-02-18
- **Phase:** 2 (cleanup complete)
- **Status:** Resolved

## Reported symptom
Users occasionally reopen/refresh the app and see an old/unused This Week layout rather than the intended current layout.

## Root-cause conclusion (ranked)
1. **Confirmed:** Users intermittently landing on Home (`/[locale]`) saw the legacy `HomeHero` card — a This Week-style summary that visually resembled the canonical `/this-week` page. This was misidentified as a regression in This Week rendering.
2. **Contributing:** Route restoration/bookmark behavior caused `/[locale]` loads in some reopen/refresh flows.
3. **Ruled out:** No SSR/CSR mismatch or hydration branch swap was found.
4. **Ruled out:** No App Router cache issue — both pages use `force-dynamic` + `revalidate = 0`.

## Phase 1 summary (commit `450ba04`)
- Disabled the `HomeHero` section on Home behind `__LEGACY_THIS_WEEK_DISABLED__` flag.
- Added temporary investigation console.info markers in layout, pages, and ParishionerHeader.
- Identified 9 legacy components with zero active imports.

## Phase 2 changes

### Removed: Legacy HomeHero from Home route
- Deleted `HomeHero` import and conditional rendering block from `app/[locale]/(app)/page.tsx`.
- Deleted `components/home/home-hero.tsx` and `components/home/progress-ring.tsx` (only used by HomeHero).
- Deleted `tests/unit/home-hero.test.tsx`.

### Removed: Phase 1 investigation instrumentation
- `app/[locale]/(app)/layout.tsx` — removed server-render console.info marker.
- `app/[locale]/(app)/page.tsx` — removed `__LEGACY_THIS_WEEK_DISABLED__` flag, investigation comments, and console.info marker.
- `app/[locale]/(app)/this-week/page.tsx` — removed investigation comments and console.info marker.
- `components/this-week/parishioner/ParishionerHeader.tsx` — removed investigation comments, client-mount console.info marker, and unused `usePathname`/`useSearchParams` imports.

### Removed: Dead legacy components (zero active imports)
- `components/this-week/ThisWeekHeader.tsx`
- `components/this-week/admin/ThisWeekAdminHero.tsx`
- `components/this-week/admin/EventsPreviewCard.tsx`
- `components/this-week/admin/AnnouncementsPanel.tsx`
- `components/this-week/admin/ServePreviewCard.tsx`
- `components/this-week/parishioner/SectionAnnouncements.tsx`
- `components/this-week/parishioner/SectionSchedule.tsx`
- `components/this-week/parishioner/SectionOpportunities.tsx`
- `components/this-week/parishioner/ParishHubPreview.tsx`
- `tests/unit/this-week-header.test.tsx`

### Kept intact (active)
- `app/[locale]/(app)/this-week/page.tsx` (canonical route)
- `components/this-week/ThisWeekParishionerView.tsx`
- `components/this-week/ThisWeekAdminView.tsx`
- `components/this-week/parishioner/ParishionerHeader.tsx`
- `components/this-week/parishioner/QuickBlocksRow.tsx`
- `components/this-week/parishioner/GroupsSection.tsx`
- `components/this-week/ThisWeekSkeleton.tsx` (loading state)

## Regression-risk notes
- Home page no longer shows Any This Week-style hero card. The remaining Home UI (`QuickActions`, `RecentUpdates`, `CommunityPreview`, `HomeQuickNav`) is unchanged.
- Canonical `/this-week` route is untouched and still renders via `ThisWeekParishionerView` / `ThisWeekAdminView`.
- No routing, locale, or auth flow changes.

## Follow-up recommendations
1. Monitor whether legacy UI reports cease after this cleanup.
2. Consider adding a redirect from `/[locale]` to `/[locale]/this-week` if Home is no longer the intended landing page.
3. If the Home route needs a This Week summary in the future, design it distinctly from the full This Week page to avoid confusion.
