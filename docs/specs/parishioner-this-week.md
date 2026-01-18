# Parishioner “This Week” Bulletin

## Goals
- Keep `/this-week` as the landing route after sign-in.
- Make the landing role-aware:
  - Parishioners always see a bulletin-style layout.
  - Admin/Clergy keep the current admin dashboard by default.
  - Admin/Clergy can preview the parishioner view without changing their default.

## Role-aware behavior
- **Parishioner default:** always render the bulletin layout.
- **Admin/Clergy default:** always render the admin dashboard layout.
- **Preview mode (Admin/Clergy only):**
  - URL param `?view=admin` (default) or `?view=parishioner` (preview).
  - Parishioners ignore `?view` and always render the bulletin layout.
  - Segmented control in the header toggles view and updates the URL.
  - Helper: `getThisWeekViewMode({ sessionRole, searchParams }) -> "admin" | "parishioner"`.

## Parishioner information architecture (order)
1. Announcements
2. Services & Schedule
3. Groups & Community
4. Opportunities to Help

### Copy rules
- Use **“Opportunities to Help”** consistently (never “ways to help this week”).
- Don’t repeat “this week” in section headers; weekly context is implied by the week switcher.

## Parishioner layout pattern
- **Quick blocks row** (horizontal scroll, tappable):
  - Announcements
  - Services
  - Community
  - Opportunities to Help
  - Each block shows a count or “next” summary and scrolls to its section.
- **Main content**:
  - Each section shows 1–3 items and a “View all” link.
  - Friendly empty states with plain language.
- **Bottom navigation**:
  - Do not change global nav; the layout should read well above tabs.

### Section requirements
**Announcements**
- Show latest 1–3 items: title + short snippet + posted date.
- CTA: “View all announcements”.
- No admin “create” actions.

**Services & Schedule**
- Show next 1–3 services/events.
- CTA: “View calendar”.
- Empty: “Nothing scheduled yet” + “View calendar”.
- No admin “add” actions.

**Groups & Community**
- Show 1–3 groups the user is in.
- If public groups exist, include “Discover groups”.
- Each row CTA: “Open”.

**Opportunities to Help**
- Rename Tasks to **Opportunities to Help**.
- Show 1–3 items.
- Display **“Due by <date>”** prominently (time if available).
- Sort by nearest due date; undated last.
- Empty: “No opportunities right now” + “Browse groups”.
- No admin “create” actions.

## Admin dashboard behaviors
- Keep existing admin dashboard layout and CTAs.
- Replace “coming soon” event CTA with **“Add event”** for Admin/Clergy.
- Admin-only header toggle allows previewing the parishioner bulletin.
