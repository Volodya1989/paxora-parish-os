# Header Strategy: PR Review Checklist

Use this checklist when reviewing changes to header rendering, page layouts, or adding new parishioner-facing pages.

---

## Acceptance Criteria (AC) — Testable Items

### A. Role-Based Header Rendering (AC-1.1 to AC-1.4)

**AC-1.1: PageHeader renders for MEMBER on parishioner pages**
- [ ] Navigate to `/groups` as a MEMBER (non-leader)
- [ ] ✅ EXPECT: PageHeader visible with "Connect with fellow parishioners..." subtitle
- [ ] ✅ EXPECT: NO week selector, NO "+ Add" dropdown
- [ ] ✅ EXPECT: Gradient `from-primary-600 via-primary-500 to-emerald-500` applied

**AC-1.2: AppHeader renders for ADMIN/SHEPHERD, PageHeader hidden**
- [ ] Navigate to `/groups` as ADMIN or SHEPHERD
- [ ] ✅ EXPECT: AppHeader visible with week selector and "+ Add" dropdown
- [ ] ✅ EXPECT: PageHeader is NOT visible
- [ ] ✅ EXPECT: Page title in AppHeader (not PageShell)

**AC-1.3: Header switches on role change (mock or in-system test)**
- [ ] If possible, switch role mid-session (via test harness or database mock)
- [ ] ✅ EXPECT: Header re-renders as correct type (AppHeader ↔ PageHeader)
- [ ] ✅ EXPECT: No duplicate headers during transition

**AC-1.4: Mobile (375px) and desktop (1440px) both render correctly**
- [ ] Open browser DevTools, set viewport to 375px (mobile)
- [ ] ✅ EXPECT: Gradient spans full width without cutoff
- [ ] ✅ EXPECT: Page title is readable (not cramped)
- [ ] ✅ EXPECT: Language toggle is accessible
- [ ] Set viewport to 1440px (desktop)
- [ ] ✅ EXPECT: Header is proportional, not overstretched
- [ ] ✅ EXPECT: Rounded corners visible on desktop (`md:rounded-b-3xl`)

---

### B. Parishioner UX Specifics (AC-2.1 to AC-2.4)

**AC-2.1: View toggles are IN-PAGE, not in global header**
- [ ] Navigate to `/serve-board` as MEMBER
- [ ] ✅ EXPECT: "Help Needed" toggle is WITHIN the main content area
- [ ] ✅ EXPECT: NO toggle or view switcher in AppHeader or PageHeader
- [ ] Same for `/tasks` as MEMBER: filters/view controls are in-page, not header

**AC-2.2: MEMBER lacks "+ Add" button in header**
- [ ] Navigate to `/tasks` as MEMBER
- [ ] ✅ EXPECT: NO "+ Add Task" button in AppHeader
- [ ] ✅ EXPECT: CTA exists only in page body (e.g., PageShell.actions or in-page button)
- [ ] Same for `/serve-board`, `/groups`, `/calendar` (as MEMBER)

**AC-2.3: All parishioner PageHeaders have meaningful subtitles**
- [ ] List all pages using PageHeader (Groups, Tasks, Calendar, Announcements, Serve, Gratitude, This Week)
- [ ] ✅ EXPECT: Each has a non-empty `subtitle` prop
- [ ] ✅ EXPECT: Subtitle is warm/welcoming, not generic ("My Tasks" not "Task Management")
- [ ] ✅ EXPECT: No subtitles contain admin language ("Manage", "Configure", "Admin", "Staff")

**AC-2.4: Parishioner page colors vary by purpose**
- [ ] Calendar: Check for teal/emerald gradient (`from-teal-600 via-teal-500 to-emerald-500`)
- [ ] Announcements: Check for amber/orange gradient (`from-amber-500 via-amber-400 to-orange-400`)
- [ ] Tasks/Serve: Check for sky/cyan gradient (`from-sky-500 via-sky-400 to-cyan-500`)
- [ ] Gratitude: Check for rose/pink gradient (`from-rose-500 via-rose-400 to-pink-400`)
- [ ] Groups: Check for primary/emerald gradient (`from-primary-600 via-primary-500 to-emerald-500`)

---

### C. Admin/Leader UX Specifics (AC-3.1 to AC-3.2)

**AC-3.1: AppHeader shows correctly for ADMIN/SHEPHERD**
- [ ] Navigate to `/admin/people` as ADMIN or SHEPHERD
- [ ] ✅ EXPECT: AppHeader displays with page title, week selector, "+ Add" dropdown
- [ ] ✅ EXPECT: Week selector functional (switches week without page reload)
- [ ] ✅ EXPECT: "+ Add" dropdown lists relevantoptions (Add Task, Add Event, Add Group)

**AC-3.2: View toggles on admin pages are segmented controls, not header dropdowns**
- [ ] Navigate to `/this-week` as COORDINATOR/ADMIN
- [ ] ✅ EXPECT: View toggle ("Coordinator" / "Spotlight") appears as **segmented control in-page**
- [ ] ✅ EXPECT: NOT in AppHeader; NOT in page title
- [ ] Same for other admin pages with multiple views

---

### D. No Regressions (AC-4.1 to AC-4.2)

**AC-4.1: No page has both AppHeader AND PageHeader simultaneously**
- [ ] For every parishioner page (Groups, Tasks, Calendar, Announcements, Serve, Gratitude, This Week):
  - [ ] Navigate as MEMBER
  - [ ] ✅ EXPECT: Only PageHeader visible (or neither, for settings pages)
- [ ] For every admin page (Admin People, Admin Parish Hub):
  - [ ] Navigate as ADMIN/SHEPHERD
  - [ ] ✅ EXPECT: Only AppHeader visible
- [ ] **Exception**: Admin pages with composite tabs (Future feature) may intentionally have AppHeader + in-page sub-headers

**AC-4.2: Language switcher present and functional in ALL parishioner PageHeaders**
- [ ] Navigate to each parishioner page as MEMBER:
  - [ ] `/groups`
  - [ ] `/tasks`
  - [ ] `/calendar`
  - [ ] `/announcements`
  - [ ] `/serve-board` (if using PageHeader)
  - [ ] `/gratitude-board`
  - [ ] `/this-week` (parishioner view)
- [ ] ✅ EXPECT: Language toggle (flag icon) visible in PageHeader top-right
- [ ] ✅ EXPECT: Click language toggle → UI language switches
- [ ] ✅ EXPECT: Preference persists across page navigation

---

### E. Quote Rule Compliance (AC-5.1 to AC-5.3)

**AC-5.1: At most ONE quote per parishioner page**
- [ ] For each parishioner page (Groups, Tasks, Serve, Gratitude, This Week, etc.):
  - [ ] Search page content for quote text
  - [ ] ✅ EXPECT: 0 or 1 quote visible on page
  - [ ] ✅ EXPECT: If quote exists, it's INSIDE PageHeader (not duplicated in page content)
  - [ ] ✅ EXPECT: Quote is inspirational/mission-aligned, not technical

**AC-5.2: Quotes appear ONLY in PageHeader, never in AppHeader**
- [ ] Inspect all admin/leader pages (Tasks admin view, Serve Board admin view, etc.)
- [ ] ✅ EXPECT: AppHeader never contains a quote element
- [ ] ✅ EXPECT: Quote rule applies ONLY to PageHeader (parishioner-facing)

**AC-5.3: Quote attribution and rendering are correct**
- [ ] For pages that include a quote:
  - [ ] ✅ EXPECT: Quote text is italicized and visually distinct
  - [ ] ✅ EXPECT: Quote attribution (`quoteSource`) is present and properly formatted
  - [ ] ✅ EXPECT: Quote doesn't overflow on mobile (375px viewport)
  - [ ] ✅ EXPECT: Quote color is `white/90` text with `white/70` attribution
  - [ ] ✅ EXPECT: Quote indentation (left border) is visible

---

## PR Description Template

When submitting a PR that modifies headers, fill this section:

```markdown
## Header Strategy Compliance

### Affected Pages/Routes
- [ ] List affected routes (e.g., `/groups`, `/tasks`, etc.)

### For Each Parishioner-Facing Page:
- [ ] User role determines header type (PageHeader for MEMBER)
- [ ] PageHeader has warm, mission-aligned subtitle
- [ ] No AppHeader or week-switcher visible for MEMBER
- [ ] Actions limited to primary CTA only
- [ ] Gradient color chosen intentionally
- [ ] Mobile preview: header looks welcoming (no cramping)
- [ ] Language toggle present and functional

### For Each Admin/Staff Page:
- [ ] AppHeader shows correctly for ADMIN/SHEPHERD
- [ ] Week selection + Add menu visible
- [ ] No PageHeader (avoid mixing)
- [ ] Role-based access enforced server-side

### For All Pages:
- [ ] PageShell or AppShell used for layout consistency
- [ ] No orphaned headers (header stacking)
- [ ] Tested on mobile (375px) AND desktop (1440px)
- [ ] Language switching works with header
- [ ] **Quote Rule**: Each page has 0–1 quote, only in PageHeader if present
- [ ] No duplicate quotes (one header = one voice)
```

---

## Testing Helpers

### 1. Mock Role Switching (for local testing)

If you need to switch roles in development:

```typescript
// In your mock/test setup:
const mockMembership = { role: "MEMBER" }; // or "ADMIN" | "SHEPHERD"
// Pass to page component as prop or via server context
```

### 2. Responsive Design Testing

- **Mobile**: DevTools → iPhone 12 (375px × 812px)
- **Tablet**: DevTools → iPad (768px × 1024px)
- **Desktop**: DevTools → Custom (1440px+)
- **Actual device**: iOS Safari, Android Chrome (optional but recommended)

### 3. Accessibility Testing

- [ ] Headings are semantic (`<h1>` in PageHeader, not `<h2>`)
- [ ] Language toggle has `aria-label` or visible label
- [ ] Contrast ratio meets WCAG AA (4.5:1 for normal text)
- [ ] Tab order is logical (no trapping)

---

## Common Issues & Fixes

| **Issue** | **Symptom** | **Fix** |
|---|---|---|
| **Double headers** | Both AppHeader + PageHeader visible | Add conditional: `{!isLeader && <PageHeader>}` |
| **Missing subtitle** | PageHeader looks bare | Pass `subtitle="..."` prop |
| **Admin language** | Member sees "Manage", "Configure" | Replace with "Join", "Connect", "Help" |
| **Wrong gradient** | Color doesn't match page purpose | Check gradient class; use color map in HEADER_STRATEGY.md |
| **Language toggle missing** | User can't switch language | Verify LanguageIconToggle in PageHeader component |
| **Header overlaps content** | Page title blocked or cramped | Check mobile viewport; ensure `-mx-4 -mt-6` offsets are correct |

---

## Reviewer Guidance

**When reviewing PRs that touch headers:**

1. **Check role-aware rendering first**: Do the conditionals match the role?
2. **Read subtitles for tone**: Does it sound warm? Remove admin jargon.
3. **Verify color intention**: Why that gradient? Should it match other similar pages?
4. **Mobile check**: Resize DevTools to 375px. Looks good?
5. **No double-headers**: Scan code for `<AppHeader>` and `<PageHeader>` on same route.
6. **Language toggle**: Confirm it's in PageHeader or explicitly tested.

**Approved if all AC criteria (AC-1.1 through AC-4.2) are met.**

---

**Document Version:** 1.0
**Effective Date:** 2026-01-31
**Last Updated:** 2026-01-31
