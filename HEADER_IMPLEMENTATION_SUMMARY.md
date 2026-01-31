# Parishioner-First Header Strategy Implementation Summary

**Date:** 2026-01-31
**Status:** ✅ Complete
**Scope:** Header strategy refactor for role-aware, parishioner-first UX

---

## Changes Made

### 1. Documentation Files Created

#### `/components/header/HEADER_STRATEGY.md`
**Living documentation** for contributors on header strategy:
- Core rules for AppHeader vs PageHeader usage
- Color mapping by page purpose
- Implementation patterns for server & layout components
- Common pitfalls & prevention
- Testing checklist

#### `/docs/HEADER_PR_CHECKLIST.md`
**PR review checklist** with 12 testable acceptance criteria (AC-1.1 through AC-4.2):
- AC-1.1 to AC-1.4: Role-based header rendering
- AC-2.1 to AC-2.4: Parishioner UX specifics
- AC-3.1 to AC-3.2: Admin/leader UX specifics
- AC-4.1 to AC-4.2: No regressions
- PR description template
- Testing helpers
- Common issues & fixes
- Reviewer guidance

---

### 2. Component Changes

#### `/components/header/AppHeader.tsx` — SIMPLIFIED
**Removed complex conditional logic:**
- ❌ Deleted: `isRegularMember`, `isParishionerView`, `isServePage`, `isServeSubview` logic
- ❌ Deleted: Conditional return `null` for members
- ✅ Added: JSDoc comment explaining header is now controlled by layout
- ✅ Removed: Unused import `stripLocale`

**Result:** AppHeader is now PURE—only renders when layout passes it, no internal filtering.

---

### 3. Layout Changes

#### `/app/[locale]/(app)/layout.tsx` — ROLE-AWARE RENDERING
**Added header visibility control:**
- ✅ Imported: `isParishLeader` from `@/lib/permissions`
- ✅ Added: `const isLeader = membership ? isParishLeader(membership.role) : false;`
- ✅ Conditional: `{isLeader && <AppHeader parishRole={membership?.role ?? null} />}`
- ✅ Added: Comment explaining header strategy

**Result:** Only leaders (ADMIN/SHEPHERD) see AppHeader. Members see PageHeader per page or nothing.

---

### 4. Page-Specific Updates

#### `/app/[locale]/(app)/tasks/page.tsx`
**✅ Already had PageHeader for members**
- Updated gradient: `from-rose-500 via-rose-400 to-amber-400` → `from-sky-500 via-sky-400 to-cyan-500`
- Reasoning: Tasks are action/help-focused, so sky/cyan color is more appropriate than rose/amber

**Current state:**
```tsx
{!isLeader && (
  <PageHeader
    pageTitle="Serve"
    parishName={parish?.name ?? "My Parish"}
    subtitle="Opportunities to help and make a difference"
    gradientClass="from-sky-500 via-sky-400 to-cyan-500"
  />
)}
```

#### `/app/[locale]/(app)/serve-board/page.tsx`
**❌ Did NOT have PageHeader → ADDED**
- ✅ Imported: `PageHeader`
- ✅ Fetched: `parish` name from Prisma
- ✅ Computed: `const isLeader = isParishLeader(membership.role);`
- ✅ Wrapped: Return in `<div className="space-y-6">` with conditional PageHeader

**New header for members:**
```tsx
{!isLeader && (
  <PageHeader
    pageTitle="Help Needed"
    parishName={parish?.name ?? "My Parish"}
    subtitle="Volunteer opportunities to serve our community"
    gradientClass="from-sky-500 via-sky-400 to-cyan-500"
  />
)}
```

#### `/app/[locale]/(app)/this-week/page.tsx`
**✅ Already compliant**
- Uses custom `ParishionerHeader` component with personalized greeting ("Good morning/afternoon/evening")
- No admin controls
- Warm, parishioner-focused design
- No changes needed—this is an acceptable variant (specialized for personalized greeting)

#### `/app/[locale]/(app)/parish/page.tsx`
**Had PageHeader but showed for EVERYONE → MADE CONDITIONAL**
- ✅ Removed: "Manage" action button logic for admins
- ✅ Added: Conditional rendering: `{!isLeader && <PageHeader ... />}`
- ✅ Changed: Member-only parishioner hub intro

**Before:**
```tsx
<PageHeader
  pageTitle="Parish Hub"
  parishName={parish?.name ?? "My Parish"}
  subtitle="Quick links to parish resources and information"
  actions={isAdmin ? <Link>Manage</Link> : undefined}
/>
```

**After:**
```tsx
{!isLeader && (
  <PageHeader
    pageTitle="Parish Hub"
    parishName={parish?.name ?? "My Parish"}
    subtitle="Quick links to parish resources and information"
    gradientClass="from-primary-600 via-primary-500 to-emerald-500"
  />
)}
```

---

## Color Mapping Applied

| Page | Gradient Class | Purpose | Used In |
|---|---|---|---|
| Groups | `from-primary-600 via-primary-500 to-emerald-500` | Community, connection | groups/page.tsx (already existed) |
| Calendar | `from-teal-600 via-teal-500 to-emerald-500` | Events, time | calendar/page.tsx (already existed) |
| Announcements | `from-amber-500 via-amber-400 to-orange-400` | News, important | announcements/page.tsx (already existed) |
| Tasks/Serve | `from-sky-500 via-sky-400 to-cyan-500` | Action, help | tasks/page.tsx (updated), serve-board/page.tsx (new) |
| Gratitude | `from-rose-500 via-rose-400 to-pink-400` | Joy, celebration | gratitude-board/page.tsx (already existed) |
| Default | `from-primary-600 via-primary-500 to-emerald-500` | Primary identity | parish/page.tsx (applied) |

---

## Testing the Changes

### Quick Verification Checklist

**As a MEMBER (parishioner):**
- [ ] `/groups` → See PageHeader, NO week selector or "+ Add" button
- [ ] `/tasks` → See PageHeader (sky/cyan gradient), NO week selector
- [ ] `/serve-board` → See PageHeader ("Help Needed"), NO week selector
- [ ] `/calendar` → See PageHeader, NO week selector
- [ ] `/announcements` → See PageHeader, NO week selector
- [ ] `/gratitude-board` → See PageHeader, NO week selector
- [ ] `/this-week` → See custom ParishionerHeader with greeting, NO week selector
- [ ] `/parish` → See PageHeader, mission-focused subtitle

**As an ADMIN or SHEPHERD:**
- [ ] `/groups` → See AppHeader with week selector + "+ Add" dropdown
- [ ] `/tasks` → See AppHeader with week selector + "+ Add" dropdown
- [ ] `/serve-board` → See AppHeader with week selector + "+ Add" dropdown
- [ ] `/calendar` → See AppHeader with week selector + "+ Add" dropdown
- [ ] `/admin/people` → See AppHeader with week selector + "+ Add" dropdown
- [ ] `/this-week` → See admin view with coordinator controls (not AppHeader, but admin-specific)
- [ ] `/parish` → See AppHeader (since admin, no PageHeader)

**No regressions:**
- [ ] No page shows both AppHeader AND PageHeader
- [ ] Language toggle works in all parishioner headers
- [ ] Mobile (375px) and desktop (1440px) both render correctly
- [ ] No console errors or hydration mismatches

---

## Documentation for Contributors

**All contributors MUST read:**
1. `/components/header/HEADER_STRATEGY.md` — Understanding the strategy
2. `/docs/HEADER_PR_CHECKLIST.md` — PR review and testing

**Key Takeaways:**
- **AppHeader** = Leaders only (ADMIN/SHEPHERD), shown globally
- **PageHeader** = Members only (MEMBER), shown per-page with warm subtitles
- **No mixing** = One header per page (except intentional composite admin tabs)
- **Colors matter** = Match gradient to page purpose (sky=action, teal=events, amber=news, rose=celebration)
- **Warm language** = "Connect", "Help", "Celebrate" — NO "Manage", "Configure", "Admin"

---

## Files Modified

```
✅ CREATED:
  - /components/header/HEADER_STRATEGY.md
  - /docs/HEADER_PR_CHECKLIST.md

🔧 MODIFIED:
  - /components/header/AppHeader.tsx (simplified logic)
  - /app/[locale]/(app)/layout.tsx (conditional AppHeader rendering)
  - /app/[locale]/(app)/tasks/page.tsx (updated gradient color)
  - /app/[locale]/(app)/serve-board/page.tsx (added PageHeader)
  - /app/[locale]/(app)/parish/page.tsx (made PageHeader conditional)

📋 VERIFIED (no changes needed):
  - /app/[locale]/(app)/this-week/page.tsx (compliant custom header)
  - /app/[locale]/(app)/groups/page.tsx (already has PageHeader)
  - /app/[locale]/(app)/calendar/page.tsx (already has PageHeader)
  - /app/[locale]/(app)/announcements/page.tsx (already has PageHeader)
  - /app/[locale]/(app)/gratitude-board/page.tsx (already has PageHeader)
```

---

## What's Next?

1. **Test thoroughly** using the verification checklist above
2. **Review PRs** using the acceptance criteria in `/docs/HEADER_PR_CHECKLIST.md`
3. **Future pages** should follow the strategy (read HEADER_STRATEGY.md before coding)
4. **Admin pages** always use AppHeader if they need week context or create controls
5. **Parishioner pages** always use PageHeader with warm subtitles

---

**Implementation complete. Ready for testing and PR review.**
