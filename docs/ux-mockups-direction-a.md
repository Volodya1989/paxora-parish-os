# Paxora Parish OS – Direction A Mockups (Calm Stewardship + Weekly Completion)

This document provides text-based mockups and implementation-ready guidance for the Direction A baseline.
All screens prioritize **“This Week”** as the primary surface and preserve a calm, trustworthy parish feel.

---

## Design Principles
1. **This Week first:** persistent priority in navigation and page hierarchy.
2. **Soft clarity:** restrained surfaces, calm contrast, consistent spacing.
3. **Action hints, not noise:** CRUD is visible via headers, kebab menus, inline affordances.

---

## Navigation Model
### Mobile (Bottom Tabs)
- Tabs: **This Week**, Serve, Groups, Calendar, More
- **More drawer**: Announcements, Profile/Settings, Sign out
- Week switcher in top bar across screens
- Active tab has filled icon + label color

### Desktop (Left Sidebar)
- Left sidebar (collapsible) with **This Week pinned at top**
- Secondary items: Serve, Groups, Calendar, Announcements
- Bottom of sidebar: Profile, Sign out
- Top header on content area: page title + week switcher + “+ Add”

### Navigation Map
- **This Week** → Task Detail, Event Detail, Announcement Detail
- **Serve** → Task Detail
- **Groups** → Group Detail → Add Members
- **Calendar** → Event Detail
- **Announcements** → Announcement Detail
- **Profile/Settings**

### Translate ONLY
- Paxora Parish OS
- This week
- Next week
- + Add
- Add serve item
- Add event
- Add group
- More
- Close more menu
- Sign out
- Signing out…

---

## Tailwind Design Tokens
**Colors**
- Primary: `emerald-700`
- Primary-soft: `emerald-50`
- Neutral: `stone-900`, `stone-700`, `stone-500`, `stone-200`, `stone-100`
- Accent: `amber-500`

**Typography Scale**
- H1: `text-2xl md:text-3xl font-semibold`
- H2: `text-xl font-semibold`
- H3: `text-lg font-medium`
- Body: `text-sm md:text-base`
- Caption: `text-xs text-stone-500`

**Spacing**
- Page padding: `px-4 md:px-8`
- Section gaps: `space-y-6 md:space-y-8`
- Card padding: `p-4 md:p-6`

**Radius**
- Cards: `rounded-xl`
- Buttons: `rounded-lg`

**Shadows**
- Cards: `shadow-sm`
- Overlay: `shadow-md`

---

## Reusable Components
- **Button** (primary, secondary, ghost)
- **Card**
- **Badge** (status)
- **Input**
- **Tabs**
- **Filters**
- **EmptyState**
- **Skeleton**
- **Modal/Drawer**
- **Dropdown**
- **Toast** (success + undo)

---

## Global Layout & Elements
- **Top Header (content area):** page title, week switcher, “+ Add”
- **Progress Ring (This Week only):** large, subtle ring + completion chip
- **Toasts:** bottom-right on desktop, top of content on mobile

---

## Screen Mockups (Text-based)

### 1) Sign-in
```
[Logo]
Welcome back
[Email input]
[Password input]  (Show)
[Sign in button]
[Forgot password]
```
- Calm card centered, subtle background

---

### 2) Home/Dashboard
```
[This Week Hero Card]
- Progress Ring 58%
- Completion Chip “7/12 done”
- CTA: View This Week

[Quick Actions]
- + Task   + Announcement

[Recent Updates]
- List of latest task completions / announcements
```

---

### 3) This Week (Primary Surface)
```
Header:
This Week   [Completion Chip]   [+ Add]
[Progress Ring]  [Week Switcher]  [Digest Status]

Section: Tasks (Today + Upcoming)
- Task Card: checkbox, title, due, assignee, “…” menu

Section: Key Events
- Event Card: date/time, location, RSVP button

Section: Announcements Preview
- Short bulletin excerpt + “View all”
```
CRUD:
- Header “+ Add”
- Item kebab: Edit, Complete/Uncomplete, Archive
- Toast on completion with Undo

---

### 4) Serve List
```
Header: Serve   [+ Add Task]
Filters: Status, Due, Assigned

[Task Row]
- Checkbox | Title | Due | Assignee | Status Chip | “…”

Empty State:
“No tasks yet” + [Create your first task]
```
CRUD:
- “+ Add Task”, inline checkbox complete, item menu (Edit, Archive)

---

### 5) Calendar View
```
Header: Calendar   [Week Switcher]   [+ Add Event]
Tabs: Week | Month

[Calendar Grid]
- Events shown as small chips

[Selected Event Panel]
- Details + RSVP/Signup
```
Empty State:
“No events this week” + [Add event]

---

### 6) Groups
```
Header: Groups   [+ Create Group]

[Group Card]
- Name
- Member count
- Small member avatars
- “…” menu (Edit, Archive, Add members)

Empty State:
“Create your first group” + [Create group]
```

---

### 7) Announcements / Bulletin
```
Header: Announcements   [+ Create Announcement]
Tabs: Drafts | Published

[Announcement Row]
- Title, excerpt, status chip
- Toggle Publish
- “…” menu (Edit, Archive)

Empty State:
“Write your first bulletin” + [Create announcement]
```

---

### 8) Event Detail (Parishioner-friendly)
```
Event Title
Date / Time / Location
Short description

[RSVP Buttons]  Yes | Maybe | No
[Signup CTA] Volunteer role (optional)
```
- Read-first, action-light

---

### 9) Profile / Settings
```
Profile Card
- Name, email, role

Preferences
- Notifications toggle
- Weekly digest toggle

Sign out button
```

---

## Loading + Empty States
- **This Week:** skeleton blocks for tasks/events; progress ring placeholder
- **Tasks:** list skeleton + empty CTA
- **Groups:** card skeleton + empty CTA
- **Announcements:** list skeleton + empty CTA
- **Calendar:** grid skeleton + empty CTA

---

## Accessibility Notes
- Focus rings: `focus-visible:ring-2 focus-visible:ring-emerald-600`
- All form inputs labeled, no placeholder-only fields
- Kebab menus have `aria-label="More actions"`
- Toast uses `aria-live="polite"`
- Color contrast meets WCAG AA

---

## CRUD Visibility Summary
- **Tasks:** Create, Edit, Complete/Uncomplete, Archive + Undo toast
- **Groups:** Create, Edit, Archive, Add Members stub
- **Announcements:** Create, Edit, Publish/Unpublish, Archive + Undo toast

---

## Week Switcher Pattern
- Desktop: header dropdown next to page title
- Mobile: top bar select with left/right arrows

---

## Primary Visual Emphasis Rules
- “This Week” is pinned first in nav
- “This Week” header is largest title on every screen where shown
- Weekly progress ring and completion chip appear only on This Week for emphasis
