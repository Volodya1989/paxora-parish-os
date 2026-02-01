# Parishioner-Facing UI Components Guide

This document provides a comprehensive overview of all parishioner-facing UI components in the Paxora Parish OS application. These components follow a consistent design philosophy focused on warmth, belonging, and intuitive navigation.

## Design Philosophy

The parishioner UI is built on three core principles:

1. **Warmth & Belonging** - Users should feel welcomed and at home
2. **Role-Awareness** - Different content and interactions based on user role (parishioner vs. leader)
3. **Accessibility & Clarity** - Information hierarchy and visual cues guide users naturally

## Color System

The parishioner UI uses a consistent color mapping for different page purposes:

| Purpose | Primary Color | Gradient | Usage |
|---------|---------------|----------|-------|
| Community/Groups | Primary | `primary-600 via-primary-500 to-emerald-500` | Groups, Parish Hub, Community |
| Events/Schedule | Teal | `teal-600 via-teal-500 to-emerald-500` | Calendar, Schedule |
| Announcements | Amber | `amber-500 via-amber-400 to-orange-400` | News, Updates |
| Opportunities/Tasks | Sky | `sky-500 via-sky-400 to-cyan-500` | Tasks, Volunteer opportunities |
| Celebration/Gratitude | Rose | `rose-500 via-rose-400 to-pink-400` | Gratitude Board, Spotlights |

Use these gradients on page headers and accent cards to maintain visual consistency.

## Core Components

### 1. ParishionerPageLayout

**File:** `components/parishioner/ParishionerPageLayout.tsx`

**Purpose:** Reusable wrapper component for all parishioner-facing pages. Eliminates boilerplate by providing consistent header, subtitle, quote, and spacing.

**Props:**
```typescript
interface ParishionerPageLayoutProps {
  pageTitle: string;              // Page heading text
  parishName: string;             // Current parish name
  isLeader: boolean;              // Show/hide page header
  subtitle?: string;              // Optional subtitle
  quote?: string;                 // Optional inspirational quote (parishioners only)
  quoteSource?: string;           // Attribution for quote
  gradientClass?: string;         // Tailwind gradient class
  actions?: React.ReactNode;      // Optional action buttons
  children: React.ReactNode;      // Page content
}
```

**Behavior:**
- Conditionally renders `PageHeader` only when `isLeader === false`
- Leaders see only the children content (admin view)
- Parishioners see PageHeader with quote, subtitle, and gradient background

**Example:**
```tsx
<ParishionerPageLayout
  pageTitle="Calendar"
  parishName={parish.name}
  isLeader={isLeader}
  subtitle="Upcoming events and activities"
  quote="Let all that you do be done in love."
  quoteSource="1 Corinthians 16:14"
  gradientClass="from-teal-600 via-teal-500 to-emerald-500"
>
  <CalendarView {...props} />
</ParishionerPageLayout>
```

**Used By:** All parishioner pages (calendar, groups, tasks, parish, serve-board, etc.)

---

## This-Week Landing Page Components

The this-week page uses specialized components to create a warm, personalized dashboard.

### 2. ParishionerHeader

**File:** `components/this-week/parishioner/ParishionerHeader.tsx`

**Purpose:** Warm, welcoming header for the parishioner landing page with time-based greetings and optional inspirational quote.

**Props:**
```typescript
interface ParishionerHeaderProps {
  parishName: string;           // Parish to display
  userName: string;             // User's first name (for greeting)
  subtitle?: string;            // Optional subtitle below greeting
  quote?: string;               // Optional inspirational quote
  quoteSource?: string;         // Quote attribution
  gradientClass?: string;       // Gradient background
  showAccessButton?: boolean;   // Show access request button (for leaders)
}
```

**Features:**
- Time-based greeting (Good morning/afternoon/evening based on current time)
- Personalized with user's first name
- Decorative background elements
- Language toggle support
- Warm, inviting tone

**Color:** Uses the primary color gradient by default

---

### 3. QuickBlocksRow

**File:** `components/this-week/parishioner/QuickBlocksRow.tsx`

**Purpose:** Grid of quick-action tiles for key metrics or navigation shortcuts.

**Props:**
```typescript
interface QuickBlocksRowProps {
  blocks: QuickBlock[];
  className?: string;
}

interface QuickBlock {
  id: string;
  icon: React.ReactNode;        // Icon component
  label: string;                // Block label
  count?: number;               // Display count/metric
  summary?: string;             // Short description
  accent?: 'primary' | 'sky' | 'rose' | 'amber'; // Color accent
  onClick?: () => void;         // Click handler for navigation
  href?: string;                // Link destination (optional)
}
```

**Features:**
- Responsive grid (2 cols mobile, 4 cols desktop)
- Icon + count display with optional badge
- Click handlers for navigation or smooth scrolling
- Color-coded accent backgrounds

**Example:**
```tsx
<QuickBlocksRow
  blocks={[
    {
      id: 'groups',
      icon: <UsersIcon className="h-5 w-5" />,
      label: 'Groups',
      count: memberGroups.length,
      accent: 'primary'
    },
    // ... more blocks
  ]}
/>
```

---

### 4. GroupsSection

**File:** `components/this-week/parishioner/GroupsSection.tsx`

**Purpose:** Display joined groups with unread indicators and last message preview (WhatsApp style).

**Props:**
```typescript
interface GroupsSectionProps {
  groups: GroupPreview[];
  hasPublicGroups: boolean;
  className?: string;
}

interface GroupPreview {
  id: string;
  name: string;
  description?: string | null;
  unreadCount?: number | null;
  lastMessage?: string | null;         // Latest message text
  lastMessageTime?: Date | null;       // When message was sent
  lastMessageAuthor?: string | null;   // Who sent the message
}
```

**Features:**
- Shows up to 4 groups (with "+N more groups" link below)
- Unread count badge for groups with new messages
- Last message preview with WhatsApp-style timestamps:
  - "Today" messages show time (2:30 PM)
  - "Yesterday" messages show "Yesterday"
  - This week's messages show day name (Mon, Wed, Fri)
  - Older messages show date (Jan 15, Dec 25)
- Displays author name before message when available
- Falls back to group description if no messages yet
- Empty state with call-to-action to discover groups

**Message Timestamp Examples:**
- Same day: "2:30 PM"
- Previous day: "Yesterday"
- Same week: "Mon" or "Wed"
- Older: "Jan 15" or "Dec 25"

---

### 5. Section Components (Announcements, Schedule, Community, Opportunities)

All section components follow a consistent pattern using `AccentSectionCard` for layout.

#### SectionAnnouncements

**File:** `components/this-week/parishioner/SectionAnnouncements.tsx`

**Props:**
```typescript
interface SectionAnnouncementsProps {
  announcements: AnnouncementPreview[];
  className?: string;
}

interface AnnouncementPreview {
  id: string;
  title: string;
  updatedAt: Date;
  createdAt: Date;
  publishedAt: Date | null;
}
```

**Features:**
- Shows top 3 most recent announcements
- Displays "Posted X days ago" relative time
- Links to full announcements page
- Uses amber/warning accent color
- Empty state: "No announcements yet"

---

#### SectionSchedule

**File:** `components/this-week/parishioner/SectionSchedule.tsx`

**Props:**
```typescript
interface SectionScheduleProps {
  events: EventPreview[];
  className?: string;
}

interface EventPreview {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  location: string | null;
}
```

**Features:**
- Shows top 3 upcoming services/events
- Displays start time and location
- Server-side locale handling for date formatting
- Uses teal/success accent color
- Empty state: "No upcoming events"

---

#### SectionCommunity

**File:** `components/this-week/parishioner/SectionCommunity.tsx`

**Props:**
```typescript
interface SectionCommunityProps {
  groups: GroupPreview[];
  hasPublicGroups: boolean;
  className?: string;
}
```

**Features:**
- Shows top 3 groups user is NOT already in
- Displays group description
- "Open" link to view/join group
- Uses primary/info accent color
- Empty state: Encourages discovery if user is in all public groups

---

#### SectionOpportunities

**File:** `components/this-week/parishioner/SectionOpportunities.tsx`

**Props:**
```typescript
interface SectionOpportunitiesProps {
  tasks: TaskPreview[];
  className?: string;
}

interface TaskPreview {
  id: string;
  title: string;
  dueAt: Date;
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE';
}
```

**Features:**
- Shows top 3 open volunteer opportunities
- Displays due date/time
- "Help" link to view task details
- Uses sky/action accent color
- Empty state: "No open opportunities"

---

### 6. ParishHubPreview

**File:** `components/this-week/parishioner/ParishHubPreview.tsx`

**Purpose:** Grid display of customizable parish resources (links, information).

**Props:**
```typescript
interface ParishHubPreviewProps {
  items: ParishHubItemData[];
  className?: string;
}

interface ParishHubItemData {
  id: string;
  label: string;
  icon: 'Bulletin' | 'MassTimes' | 'Confession' | 'Website' | 'Phone' | 'Social';
  targetType: 'EXTERNAL' | 'INTERNAL';
  targetUrl?: string;
  internalRoute?: string;
}
```

**Features:**
- Shows 6 items by default, with "+N more" indicator
- Icon-based tiles with color coding
- Supports external URLs and internal routes
- Click to navigate or open in new tab for external links
- Customizable per parish (admin can configure)

**Icon Color Mapping:**
- Each icon type has a distinct color for easy visual scanning
- Colors chosen to be warm and inviting

---

## Common Patterns

### Empty State Pattern

All sections use a consistent empty state pattern:

```tsx
<div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-{color}-200 bg-{color}-50/50 px-6 py-10 text-center">
  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-{color}-100 text-{color}-600">
    <Icon className="h-7 w-7" />
  </div>
  <div className="max-w-xs space-y-1">
    <p className="font-medium text-ink-800">{title}</p>
    <p className="text-sm text-ink-500">{description}</p>
  </div>
  {showCTA && <Button variant="secondary" size="sm" onClick={action}>{ctaText}</Button>}
</div>
```

### AccentSectionCard Pattern

Used by all section components for consistent layout:

```tsx
<AccentSectionCard
  title="Section Title"
  icon={<Icon />}
  accent="primary"
  subtitle={optional}
  actionText="View all"
  onAction={onActionClick}
>
  {/* Content goes here */}
</AccentSectionCard>
```

### Message Time Formatting

Used in GroupsSection for WhatsApp-style timestamps. See `lib/time/messageTime.ts` for utility function.

---

## Adding New Parishioner Sections

### Step-by-Step Guide

**1. Understand the Data**
- Identify what data the new section needs
- Create a type definition (e.g., `NotificationPreview`)
- Add fetching logic to `lib/queries/this-week.ts`

**2. Create the Section Component**
```tsx
// components/this-week/parishioner/SectionNewFeature.tsx
import { AccentSectionCard } from '@/components/ui/';

interface NewFeatureProps {
  items: NewItemPreview[];
  className?: string;
}

/**
 * Section showing [feature type].
 *
 * Displays top 3 items with [description of what's shown].
 *
 * @example
 * <SectionNewFeature items={items} />
 */
export default function SectionNewFeature({ items, className }: NewFeatureProps) {
  return (
    <AccentSectionCard
      title="New Feature"
      icon={<Icon />}
      accent="primary"  // Use appropriate color
      actionText="View all"
      onAction={() => router.push('/new-feature')}
    >
      {items.length === 0 ? (
        <EmptyState />
      ) : (
        <ItemList items={items} />
      )}
    </AccentSectionCard>
  );
}
```

**3. Choose Appropriate Accent Color**
- Groups/Community: `primary`
- Events/Calendar: `teal`
- Announcements: `amber`
- Tasks/Opportunities: `sky`
- Gratitude: `rose`

**4. Add to This-Week Page**
```tsx
// In ThisWeekParishionerView or ThisWeekPage
<SectionNewFeature items={data.newItems} />
```

**5. Update Query if Needed**
- Add data fetching to `lib/queries/this-week.ts`
- Update `ThisWeekData` type with new field
- Ensure role-based filtering is applied

---

## Role-Based Behavior

### Parishioners (MEMBER role)
- See full ParishionerPageLayout with PageHeader on page pages
- See all parishioner sections on this-week page
- Can view but not manage/create items (depends on specific feature)
- See inspirational quotes on headers
- Can access public groups and filtered content

### Leaders (ADMIN/SHEPHERD roles)
- See admin-focused content on pages (no PageHeader)
- May see different dashboard or additional admin sections
- Full management capabilities
- Different action buttons and permissions

---

## Key Utilities

### Message Time Formatting
**File:** `lib/time/messageTime.ts`

```typescript
export function formatMessageTime(date: Date | null | undefined): string
```

Formats recent messages in WhatsApp style:
- Today: "2:30 PM"
- Yesterday: "Yesterday"
- This week: "Mon", "Wed", etc.
- Older: "Jan 15"

### Using in Components
```tsx
import { formatMessageTime } from '@/lib/time/messageTime';

const timestamp = formatMessageTime(lastMessageTime);
```

---

## Accessibility Considerations

1. **Semantic HTML** - Use proper heading hierarchy (h1, h2, h3)
2. **Color + Text** - Never rely on color alone for meaning (badges include labels)
3. **Empty States** - Always provide helpful, actionable empty states
4. **Link Text** - Use descriptive link text ("View all announcements" vs. "Click here")
5. **Icons + Labels** - QuickBlocks and section headers combine icons with text
6. **Responsive** - Test on mobile, tablet, and desktop viewports

---

## Testing Checklist

When adding or modifying parishioner components:

- [ ] Parishioner view displays correctly (with PageHeader and quote)
- [ ] Leader view displays correctly (without PageHeader)
- [ ] Empty states are shown when appropriate
- [ ] Empty state CTAs navigate correctly
- [ ] Time-based content (timestamps, dates) formats correctly
- [ ] Responsive design works on mobile, tablet, desktop
- [ ] Links navigate to correct destinations
- [ ] Accent colors match the color system
- [ ] Component JSDoc is complete and accurate
- [ ] No console errors or warnings

---

## Related Documentation

- **HEADER STRATEGY:** See `components/header/HEADER_STRATEGY.md` for detailed header rendering logic
- **Design System:** Refer to Tailwind color utilities and component library docs
- **Product Philosophy:** See `README.md` for overall app design principles

---

## Questions & Contributions

When adding new parishioner features:
1. Start by reviewing this guide
2. Look at similar existing components for patterns
3. Consult the Header Strategy for page-level decisions
4. Follow the empty state and color patterns
5. Add JSDoc documentation and usage examples
6. Update this guide with new patterns or components
