# Next.js dynamic params Promise fix

## Root cause
Next.js App Router dynamic params can be delivered as a Promise in async components under the “sync dynamic APIs” behavior. Direct property access (`params.id`) can trigger runtime warnings/errors.

## Files fixed
- `app/(app)/calendar/events/[eventId]/edit/page.tsx`
- `app/(app)/calendar/events/[eventId]/delete/page.tsx`
- `app/(app)/events/[id]/page.tsx`
- `app/(app)/groups/[groupId]/page.tsx`

## Pattern used
- Type `params` as `Promise<{ ... }>` in page props.
- `await` params at the top of the async page (`const { id } = await params;`).
