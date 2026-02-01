# Template: Creating a New Parishioner Section Component

This template provides a step-by-step guide and boilerplate for creating new sections in the parishioner landing page (this-week view).

## Overview

The parishioner dashboard consists of reusable section components. Each section follows a consistent pattern:

1. Accept typed data props
2. Use `AccentSectionCard` for layout
3. Show top 3-5 items
4. Include empty state
5. Provide "View all" navigation
6. Use appropriate accent color

## Step 1: Plan Your Data

Before creating the component, identify what data it needs:

```typescript
// Define the shape of each item
type YourItemPreview = {
  id: string;
  title: string;
  description?: string | null;
  date?: Date;
  // ... other fields relevant to your section
};

// Define component props
type SectionYourFeatureProps = {
  items: YourItemPreview[];
};
```

## Step 2: Create the Component File

Create a new file in `components/this-week/parishioner/`:

**File:** `components/this-week/parishioner/SectionYourFeature.tsx`

```tsx
import Link from "next/link";
import { YourIcon } from "@/components/icons/ParishIcons";
import AccentSectionCard from "@/components/layout/AccentSectionCard";
import { routes } from "@/lib/navigation/routes";

type YourItemPreview = {
  id: string;
  title: string;
  description?: string | null;
  // Add your fields here
};

type SectionYourFeatureProps = {
  items: YourItemPreview[];
};

/**
 * Section displaying [what this section shows].
 *
 * Shows the top 3 [items] with [key information displayed].
 * Uses a [COLOR]/[tone] accent color for [reasoning].
 * Includes a "View all" link to the full [page] page.
 *
 * **Empty State:** Shows when no [items] are available.
 *
 * **Color System:** [Color] accent ([tone name])
 *
 * @param props - Component props
 * @param props.items - Array of [item type] previews to display
 * @returns Rendered [feature] section with scroll anchor
 *
 * @example
 * <SectionYourFeature items={items} />
 */
export default function SectionYourFeature({ items }: SectionYourFeatureProps) {
  return (
    <section id="your-feature" className="scroll-mt-24">
      <AccentSectionCard
        title="Your Feature Title"
        icon={<YourIcon className="h-5 w-5" />}
        borderClass="border-{color}-200"
        iconClass="bg-{color}-100 text-{color}-700"
        action={
          <Link
            className="whitespace-nowrap text-sm font-medium text-ink-700 underline"
            href={routes.yourPage}
          >
            View all
          </Link>
        }
      >
        <div className="space-y-3">
          {items.length === 0 ? (
            // Empty state
            <div className="rounded-card border border-{color}-100 bg-{color}-50/40 px-4 py-3 text-sm text-ink-500">
              No [items] right now.{" "}
              <Link className="font-medium text-ink-700 underline" href={routes.yourPage}>
                [View/Browse] [items]
              </Link>
              .
            </div>
          ) : (
            // Item list - show top 3
            items.slice(0, 3).map((item) => (
              <Link
                key={item.id}
                href={`${routes.yourPage}/${item.id}`}
                className="block rounded-card border border-mist-100 bg-white px-4 py-3 transition hover:border-{color}-200 hover:bg-{color}-50/30"
              >
                <p className="text-sm font-semibold text-ink-900">{item.title}</p>
                {item.description && (
                  <p className="mt-1 text-xs text-ink-500">{item.description}</p>
                )}
                {/* Add additional fields as needed */}
              </Link>
            ))
          )}
        </div>
      </AccentSectionCard>
    </section>
  );
}
```

## Step 3: Choose Your Accent Color

Select a color that matches the section's purpose. Reference the color system:

| Purpose | Color | Gradient | Accent Classes |
|---------|-------|----------|-----------------|
| Community/Groups | Primary | `primary-600 via-primary-500 to-emerald-500` | `border-primary-200`, `bg-primary-100`, `text-primary-700` |
| Events/Calendar | Teal | `teal-600 via-teal-500 to-emerald-500` | `border-teal-200`, `bg-teal-100`, `text-teal-700` |
| Announcements | Amber | `amber-500 via-amber-400 to-orange-400` | `border-amber-200`, `bg-amber-100`, `text-amber-700` |
| Tasks/Opportunities | Sky | `sky-500 via-sky-400 to-cyan-500` | `border-sky-200`, `bg-sky-100`, `text-sky-700` |
| Celebration/Gratitude | Rose | `rose-500 via-rose-400 to-pink-400` | `border-rose-200`, `bg-rose-100`, `text-rose-700` |
| New Features | Violet/Indigo/Blue | (Choose from available) | Corresponding color classes |

## Step 4: Update the Data Query

Add your data fetching to `lib/queries/this-week.ts`:

```typescript
// In ThisWeekData type
export type ThisWeekData = {
  // ... existing fields
  yourFeature: YourItemPreview[];
};

// In getThisWeekDataForUser function
const [
  // ... existing queries
  yourFeatureData
] = await Promise.all([
  // ... existing queries
  prisma.yourModel.findMany({
    where: {
      parishId,
      // Filter by user permissions if needed
    },
    orderBy: { createdAt: "desc" },
    take: 3, // or however many you want
    select: {
      id: true,
      title: true,
      description: true,
      // Include relevant fields
    }
  })
]);

// In return statement
return {
  // ... existing fields
  yourFeature: yourFeatureData.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description
  }))
};
```

## Step 5: Add to the Landing Page

Update `components/this-week/ThisWeekParishionerView.tsx` or the appropriate page component:

```tsx
import SectionYourFeature from "@/components/this-week/parishioner/SectionYourFeature";

export default function ThisWeekParishionerView({ data }: { data: ThisWeekData }) {
  return (
    <div className="space-y-6">
      {/* ... existing sections ... */}

      {/* New section - add in appropriate position */}
      <SectionYourFeature items={data.yourFeature} />

      {/* ... more sections ... */}
    </div>
  );
}
```

## Step 6: Documentation Checklist

Before submitting your component:

- [ ] Component has comprehensive JSDoc with @param, @returns, @example
- [ ] Empty state messaging is specific and helpful
- [ ] Color accent classes are applied consistently
- [ ] "View all" link points to the correct full page
- [ ] Icons are imported and used correctly
- [ ] Component accepts typed props with clear interfaces
- [ ] Shows top 3 items (or appropriate number for your feature)
- [ ] Fallback descriptions/text for missing optional fields
- [ ] Responsive design tested on mobile, tablet, desktop
- [ ] Build passes without errors or type warnings
- [ ] PARISHIONER_COMPONENTS.md has been updated with your new component

## Step 7: Update Documentation

Add your new section to `components/parishioner/PARISHIONER_COMPONENTS.md`:

```markdown
### [X]. SectionYourFeature

**File:** `components/this-week/parishioner/SectionYourFeature.tsx`

**Purpose:** [Describe what this section shows]

**Props:**
\`\`\`typescript
interface SectionYourFeatureProps {
  items: YourItemPreview[];
}
\`\`\`

**Features:**
- [Feature 1]
- [Feature 2]
- [Feature 3]
```

## Testing Checklist

When your new section is complete:

- [ ] Component builds without errors
- [ ] Empty state displays correctly
- [ ] Up to 3 items display correctly
- [ ] Colors match the chosen accent scheme
- [ ] Links navigate to correct destinations
- [ ] Responsive layout works on all screen sizes
- [ ] No console errors or type warnings
- [ ] Section appears in correct position on page
- [ ] "View all" link displays and works
- [ ] Accessibility: Proper heading hierarchy, semantic HTML

## Common Patterns

### Dynamic Lists

If your items need special formatting or conditional rendering:

```tsx
items.slice(0, 3).map((item) => (
  <Link
    key={item.id}
    href={`/path/${item.id}`}
    className="block rounded-card border border-mist-100 bg-white px-4 py-3 transition hover:border-{color}-200"
  >
    {/* Main content */}
    <p className="text-sm font-semibold text-ink-900">{item.title}</p>

    {/* Optional metadata */}
    {item.metadata && (
      <p className="mt-1 text-xs font-medium text-ink-400">{item.metadata}</p>
    )}

    {/* Status badge */}
    {item.badge && <Badge tone="info">{item.badge}</Badge>}
  </Link>
))
```

### Conditional sections

Show/hide based on data availability:

```tsx
{items.length === 0 ? (
  <EmptyState />
) : items.length > 0 ? (
  <ItemList items={items} />
) : null}
```

### Responsive Grid Layout

For items that need grid layout instead of stacked:

```tsx
<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
  {items.slice(0, 3).map((item) => (
    <Card key={item.id}>{/* ... */}</Card>
  ))}
</div>
```

## Example: Complete Section

Here's a complete example of a simple, well-documented section:

**File:** `components/this-week/parishioner/SectionBibleReading.tsx`

```tsx
import Link from "next/link";
import { BookOpenIcon } from "@/components/icons/ParishIcons";
import AccentSectionCard from "@/components/layout/AccentSectionCard";
import { routes } from "@/lib/navigation/routes";

type DailyReading = {
  id: string;
  title: string;
  scripture: string;
  date: Date;
};

type SectionBibleReadingProps = {
  readings: DailyReading[];
};

/**
 * Section displaying daily Bible readings for the week.
 *
 * Shows the top 3 upcoming daily readings with scripture references.
 * Uses a violet accent color for spiritual/prayer-focused content.
 * Includes a "View all" link to the full readings schedule.
 *
 * **Empty State:** Shows when no readings are available.
 *
 * **Color System:** Violet accent (spiritual tone)
 *
 * @param props - Component props
 * @param props.readings - Array of daily reading previews
 * @returns Rendered readings section with scroll anchor
 *
 * @example
 * <SectionBibleReading readings={weeklyReadings} />
 */
export default function SectionBibleReading({ readings }: SectionBibleReadingProps) {
  return (
    <section id="readings" className="scroll-mt-24">
      <AccentSectionCard
        title="Daily Readings"
        icon={<BookOpenIcon className="h-5 w-5" />}
        borderClass="border-violet-200"
        iconClass="bg-violet-100 text-violet-700"
        action={
          <Link
            className="whitespace-nowrap text-sm font-medium text-ink-700 underline"
            href={routes.readings}
          >
            View all
          </Link>
        }
      >
        <div className="space-y-3">
          {readings.length === 0 ? (
            <div className="rounded-card border border-violet-100 bg-violet-50/40 px-4 py-3 text-sm text-ink-500">
              No readings scheduled. {" "}
              <Link className="font-medium text-ink-700 underline" href={routes.readings}>
                View reading plan
              </Link>
              .
            </div>
          ) : (
            readings.slice(0, 3).map((reading) => (
              <div
                key={reading.id}
                className="rounded-card border border-mist-100 bg-white px-4 py-3"
              >
                <p className="text-xs font-semibold uppercase text-ink-400">
                  {reading.date.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric"
                  })}
                </p>
                <p className="mt-2 text-sm font-semibold text-ink-900">{reading.title}</p>
                <p className="mt-1 text-xs text-violet-600 font-medium italic">
                  {reading.scripture}
                </p>
              </div>
            ))
          )}
        </div>
      </AccentSectionCard>
    </section>
  );
}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Component doesn't appear | Check it's imported and added to landing page |
| Empty state always shows | Verify data is being fetched correctly in query |
| Colors don't match | Ensure all classes use the same color prefix (e.g., all `violet-*`) |
| Build fails | Check TypeScript types and JSDoc syntax |
| Hover effects don't work | Verify `hover:` classes are included in className |
| Links don't navigate | Check `href` values and routes are correct |
| Icons not showing | Verify icon import and className on icon element |

---

**Questions?** Refer to the main PARISHIONER_COMPONENTS.md guide for more details on patterns, color system, and architecture.
