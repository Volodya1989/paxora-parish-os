# Header Strategy Guide

## Overview

This document defines the canonical header strategy for Paxora Parish OS. Headers are role-aware and context-sensitive:

- **AppHeader** → Leaders (ADMIN/SHEPHERD) get global context, week selector, and create controls
- **PageHeader** → Members (MEMBER role) get warm, welcoming parishioner-facing page introductions
- **No mixing** → One primary header per page except intentional composite admin pages with tabs

## Core Rules

### Rule 1: Check User Role First

```typescript
IF user.role ∈ [ADMIN, SHEPHERD]:
  USE AppHeader (global) + PageShell (content)
ELSE IF user.role == MEMBER AND page is parishioner-facing:
  USE PageHeader (warm entry) + PageShell (content)
ELSE:
  USE PageShell only (minimal header)
```

### Rule 2: AppHeader Usage Checklist

AppHeader (`/components/header/AppHeader.tsx`) is for **leader views only**:

- ✅ User is ADMIN or SHEPHERD
- ✅ Page requires week/time context for decision-making
- ✅ Page requires global add/create controls (week dropdown, "+ Add" button)
- ✅ Page title comes from AppHeader, not PageShell
- ✅ No redundant headers (one header per layout level)

**Pages that use AppHeader:**
- `/admin/people` (leader only)
- `/tasks` (leader view)
- `/serve-board` (leader view with Kanban)
- `/this-week` (leader/coordinator view)
- `/parish` (admin hub customization)
- `/groups` (leader managing groups)
- `/calendar` (leader managing events)
- `/announcements` (leader posting/editing)

### Rule 3: PageHeader Usage Checklist

PageHeader (`/components/header/PageHeader.tsx`) is for **parishioner-facing pages**:

- ✅ Page is public-facing or parishioner-focused
- ✅ Title fits 1–2 lines and conveys page identity (not technical)
- ✅ Subtitle is **warm, mission-oriented** (not admin language)
  - ❌ Avoid: "Manage", "Admin", "Configure", "Staff", "Database"
  - ✅ Use: "Connect", "Help", "Celebrate", "Stay informed", "Join"
- ✅ No admin controls visible (no week selector, no "+ Add" button)
- ✅ Actions = max 1 primary button when appropriate (request, join, post)
- ✅ Gradient color matches page purpose + tone
- ✅ Language toggle (LanguageIconToggle) always present

**Pages that use PageHeader (for MEMBER role):**
- `/groups` (parishioner view: "Connect with fellow parishioners")
- `/tasks` (parishioner view: "My Tasks" or task list)
- `/serve-board` (parishioner view: "Help Needed")
- `/calendar` (parishioner view: "Upcoming events")
- `/announcements` (parishioner view: "Stay informed...")
- `/gratitude-board` (all roles: celebratory)
- `/this-week` (parishioner view: personal week summary)
- `/parish` (parishioner view: parish hub quick actions)

### Rule 4: Hide Both Headers When

- User is in settings/profile page (`/profile`)
- Page is access gate or modal-driven (access request, invite acceptance)
- Chat or inline content owns its own title
- Page has no meaningful title

### Rule 5: The One-Quote-Per-Page Rule

PageHeader supports optional inspirational quotes to reinforce page purpose and build emotional connection:

**Quote Rule:**
- ✅ Each parishioner page may display **at most ONE quote**
- ✅ Quotes **must live ONLY inside PageHeader** (never duplicated in page content)
- ✅ Quote content must be **inspirational, mission-aligned, or contextual** to the page
- ✅ Quote attribution (`quoteSource`) is **optional but recommended**
- ✅ Quote placement automatically prevents duplicate quotes (one header = one voice)

**When to use quotes:**
- Pages with mission-critical actions (Help Needed, Volunteer, Serve)
- Pages celebrating community (Gratitude Board, Groups)
- Pages inviting deeper engagement (This Week overview)

**When NOT to use quotes:**
- Admin/leader pages (AppHeader never shows quotes)
- Technical pages (settings, profile)
- Simple navigation pages without emotional resonance

**PageHeader Props for Quotes:**
```typescript
<PageHeader
  pageTitle="Help Needed"
  parishName="My Parish"
  subtitle="Volunteer opportunities to serve our community"
  quote="'The greatest among you must be a servant.' — Matthew 23:11"
  quoteSource="Jesus Christ"
  gradientClass="from-sky-500 via-sky-400 to-cyan-500"
/>
```

**Quote rendering:**
- Displayed in italic, smaller text than title
- Indented with a left border (visual distinction)
- Attribution shown in lighter color, smallest font
- Responsive: works well on mobile and desktop

## Color Mapping by Page Purpose

Use gradient colors to reinforce page identity and tone:

| **Page** | **Purpose** | **Gradient** | **Meaning** |
|---|---|---|---|
| Groups | Community, connection | `from-primary-600 via-primary-500 to-emerald-500` | Welcoming, growth |
| Calendar | Events, time, planning | `from-teal-600 via-teal-500 to-emerald-500` | Time, clarity |
| Announcements | News, information | `from-amber-500 via-amber-400 to-orange-400` | Important, attention |
| Tasks/Serve | Action, help needed | `from-sky-500 via-sky-400 to-cyan-500` | Action, clarity |
| Gratitude/Celebration | Praise, joy | `from-rose-500 via-rose-400 to-pink-400` | Joy, celebration |
| Default/This Week | Primary, welcoming | `from-primary-600 via-primary-500 to-emerald-500` | Primary identity |

## Implementation Pattern

### For Server Components (Pages)

```tsx
// app/[locale]/(app)/groups/page.tsx
import { getParishMembership } from "@/server/db/groups";
import { isParishLeader } from "@/lib/permissions";
import PageHeader from "@/components/header/PageHeader";

export default async function GroupsPage() {
  const membership = await getParishMembership(parishId, userId);
  const isLeader = isParishLeader(membership.role);

  return (
    <div className="space-y-6">
      {/* Show PageHeader for parishioner view */}
      {!isLeader && (
        <PageHeader
          pageTitle="Groups"
          parishName={parish.name}
          subtitle="Connect with fellow parishioners who share your interests"
          gradientClass="from-primary-600 via-primary-500 to-emerald-500"
        />
      )}
      <GroupsView {...props} />
    </div>
  );
}
```

### For Layout Components

```tsx
// app/[locale]/(app)/layout.tsx
import AppHeader from "@/components/header/AppHeader";

export default async function AppLayout({ children, params }) {
  const membership = await getParishMembership(parishId, userId);
  const isLeader = isParishLeader(membership.role);

  return (
    <AppShell parishRole={membership?.role}>
      {/* Only render AppHeader for leaders */}
      {isLeader && <AppHeader parishRole={membership.role} />}
      <main>
        {children}
      </main>
    </AppShell>
  );
}
```

## Common Pitfalls & Prevention

### Pitfall 1: Mixing Headers

**❌ Wrong:**
```tsx
<AppHeader {...props} />
<PageHeader {...props} />
<Content />
```

**✅ Correct:**
```tsx
{isLeader && <AppHeader {...props} />}
{!isLeader && <PageHeader {...props} />}
<Content />
```

### Pitfall 2: Generic or Missing Subtitles

**❌ Wrong:**
```tsx
<PageHeader pageTitle="Groups" parishName="My Parish" />
```

**✅ Correct:**
```tsx
<PageHeader
  pageTitle="Groups"
  parishName="My Parish"
  subtitle="Connect with fellow parishioners who share your interests"
/>
```

### Pitfall 3: Admin Language in Parishioner Headers

**❌ Wrong:**
```tsx
subtitle="Manage groups and roles"
```

**✅ Correct:**
```tsx
subtitle="Join groups and connect with community members"
```

### Pitfall 4: Wrong Gradient Color

**❌ Wrong:**
```tsx
// Tasks page (should be sky, not emerald)
gradientClass="from-primary-600 via-primary-500 to-emerald-500"
```

**✅ Correct:**
```tsx
// Tasks page (action/help focus)
gradientClass="from-sky-500 via-sky-400 to-cyan-500"
```

### Pitfall 5: Missing Language Toggle

**❌ Wrong:**
```tsx
<PageHeader pageTitle="Groups" parishName="Parish" subtitle="..." />
// Language toggle is missing
```

**✅ Correct:**
```tsx
// PageHeader component always includes LanguageIconToggle automatically
<PageHeader pageTitle="Groups" parishName="Parish" subtitle="..." />
```

## Testing Checklist

When adding or modifying a header, verify:

- [ ] **Role-based rendering**: Toggle user role (mock or live) → header changes correctly
- [ ] **Mobile view**: Header looks warm and welcoming on 375px viewport
- [ ] **Desktop view**: Header spans full width, gradient is vibrant, text is readable
- [ ] **Language switching**: Language toggle works and persists
- [ ] **No doubled headers**: Only ONE primary header visible (AppHeader OR PageHeader, not both)
- [ ] **Warm subjective**: Read subtitle aloud. Does it feel welcoming? (not technical/admin)
- [ ] **Color intentional**: Does gradient color match page purpose?
- [ ] **Actions clear**: Is there 0–1 primary CTA? Are secondary controls in-page?

## Future Considerations

- **Seasonal headers**: Easter/Christmas/Fasting periods may warrant special messaging or color variants
- **Custom gradients per parish**: Future feature to allow parishes to customize header colors
- **Breadcrumb trails**: May add navigation breadcrumbs for deeper pages (e.g., Groups > Youth Group)
- **Page-level icons**: Future variant with optional icon before title (e.g., Community icon for Groups)

---

**Last Updated:** 2026-01-31
**Maintained By:** Product + UX Team
**Next Review:** After 3+ new major pages added
