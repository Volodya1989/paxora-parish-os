# Header Strategy Quick Reference

## For New Contributors

**Start here:** [`/components/header/HEADER_STRATEGY.md`](./components/header/HEADER_STRATEGY.md)

## For PR Reviewers

**Use this checklist:** [`/docs/HEADER_PR_CHECKLIST.md`](./docs/HEADER_PR_CHECKLIST.md)

## The Rule

```
IF user is ADMIN or SHEPHERD:
  ✅ They see AppHeader (with week selector + "+ Add" button)
ELSE IF user is MEMBER:
  ✅ They see PageHeader (warm, welcoming, gradient, no admin controls)
ELSE:
  ✅ No header (or minimal header for special pages like settings)
```

## Key Files

| File | Purpose |
|------|---------|
| `/components/header/AppHeader.tsx` | Global leader context header (week selector, add menu) |
| `/components/header/PageHeader.tsx` | Parishioner welcome header (warm, gradient, mission-focused) |
| `/app/[locale]/(app)/layout.tsx` | Decides which header to render based on role |
| `/components/header/HEADER_STRATEGY.md` | Full documentation for contributors |
| `/docs/HEADER_PR_CHECKLIST.md` | PR review checklist with AC criteria |

## Color Guide

- **Community/Groups:** `from-primary-600 via-primary-500 to-emerald-500`
- **Events/Calendar:** `from-teal-600 via-teal-500 to-emerald-500`
- **News/Announcements:** `from-amber-500 via-amber-400 to-orange-400`
- **Tasks/Help:** `from-sky-500 via-sky-400 to-cyan-500`
- **Celebration/Gratitude:** `from-rose-500 via-rose-400 to-pink-400`

## Implementation in a New Page

**For a parishioner-facing page** (e.g., new "Directory" page):

```tsx
import PageHeader from "@/components/header/PageHeader";
import { isParishLeader } from "@/lib/permissions";

export default async function DirectoryPage() {
  const membership = await getParishMembership(parishId, userId);
  const isLeader = isParishLeader(membership.role);
  const parish = await fetchParish(parishId);

  return (
    <div className="space-y-6">
      {/* Show PageHeader for members */}
      {!isLeader && (
        <PageHeader
          pageTitle="Directory"
          parishName={parish.name}
          subtitle="Meet your parish community"
          gradientClass="from-primary-600 via-primary-500 to-emerald-500"
        />
      )}
      <DirectoryContent isLeader={isLeader} />
    </div>
  );
}
```

**For an admin/staff page** (AppHeader is rendered by layout automatically):

```tsx
// Layout already shows AppHeader for admins, so just render your content
export default async function AdminPage() {
  return (
    <div className="space-y-6">
      <AdminContent />
    </div>
  );
}
```

## Common Mistakes to Avoid

❌ **DON'T:**
- Show both AppHeader and PageHeader on the same page
- Use admin language in PageHeader subtitle ("Manage", "Configure", "Admin")
- Hard-code AppHeader on pages that should check the user's role
- Forget to add language toggle to PageHeader
- Use the wrong gradient color for the page purpose

✅ **DO:**
- Check user role and render appropriately
- Use warm, welcoming language in PageHeader subtitles
- Let the layout handle AppHeader visibility
- Always include PageHeader for parishioner pages
- Test on mobile (375px) and desktop (1440px)
- Include a subtitle that explains the page's purpose

## Testing

```bash
# As a MEMBER user:
# 1. Visit /groups → Should see PageHeader, no week selector
# 2. Visit /tasks → Should see PageHeader (sky gradient), no week selector
# 3. Visit /serve-board → Should see PageHeader ("Help Needed"), no week selector

# As an ADMIN user:
# 1. Visit /groups → Should see AppHeader with week selector
# 2. Visit /tasks → Should see AppHeader with week selector
# 3. Visit /serve-board → Should see AppHeader with week selector

# Check:
# - No page shows both headers
# - Language toggle works
# - Mobile looks good (no cramping)
```

## Questions?

1. Read `/components/header/HEADER_STRATEGY.md` for detailed strategy
2. Check `/docs/HEADER_PR_CHECKLIST.md` for AC criteria
3. Look at `/app/[locale]/(app)/groups/page.tsx` for a working example
