# Request System Implementation Plan (Updated)

This plan consolidates the Request System direction and includes the latest admin/clergy requirements (assignment mapping, board view, overdue reminders, and visibility controls).

## Admin/Clergy Assignment Mapping Requirement
- **Who can map**: Clergy and parish admins (e.g., `ADMIN`/`SHEPHERD`) can assign/map requests to specific users responsible for handling them.
- **Source of assignees**: The assignee selector **must be populated from existing registered users** in the parish (active members in the app).
- **UX placement**:
  - In the **Requests Inbox** (admin/clergy), provide a lightweight “Assign to” control on the request detail view.
  - In the **Request creation** form (optional), allow the clergy to pre-assign when submitting on behalf of a parishioner.
- **Data model linkage**: Use `assignedToUserId` on the `Request` model to persist the mapping.
- **Notifications**: When assigned, notify the assignee via the existing email/notification patterns (if enabled).

## Admin/Clergy Request Board (Recommended)
- **Board view**: Add a simple board (kanban-style or grouped list) for admins/clergy to track requests by status.
- **Columns**: `SUBMITTED`, `ACKNOWLEDGED`, `SCHEDULED`, `COMPLETED` (with optional `CANCELED`).
- **Filters**: Type, assignee, privacy/visibility scope, and “Overdue.”
- **Detail drawer**: Status updates, assignment, and visibility controls live in a single detail view to reduce clicks.

## Overdue Reminders (Soft Nudges)
- **Purpose**: Keep staff aware without punitive limits.
- **Suggested rules**:
  - `SUBMITTED` older than 48 hours → gentle reminder.
  - `ACKNOWLEDGED` or `SCHEDULED` with no update for N days → gentle reminder.
- **Targets**:
  - Assigned user first.
  - Fallback to clergy/admin if unassigned.
- **Channels**: Use existing email/notification preferences (no hard blocking).

## Visibility Scope Controls (Clergy/Admin)
Clergy/admins can choose visibility scope per request:
- **CLERGY_ONLY** (default for confession/talk-to-priest).
- **ADMIN_ALL** (visible to all parish admins + clergy).
- **ADMIN_SPECIFIC** (visible to clergy + explicitly assigned users).

### Rules
- Only clergy/admin can change visibility scope.
- Parishioners can view their own requests and status, but never reassign or expand visibility.
- Confession requests are always **CLERGY_ONLY** by default and should never prompt for detailed sensitive content.
- **Clergy reassignment option**: If confession request volume is high, clergy can reassign scheduling tasks to an admin while keeping the request visibility scoped per policy (e.g., `ADMIN_SPECIFIC`).

## Implementation Checklist Updates
Add these steps to the build plan:
1. **Assignment mapping**: Build an assignee selector using current parish users; allow clergy/admin to map requests to a user and store `assignedToUserId`.
2. **Requests board**: Add admin/clergy board view with status columns, filters, and a detail drawer.
3. **Overdue reminders**: Implement soft reminder logic and notifications for stale requests.
4. **Visibility scope**: Add visibility scope field and clergy/admin controls in the request detail view.
5. **Confession scheduling reassignment**: Allow clergy to reassign confession request scheduling to an admin when volume is high without widening visibility beyond policy.

## Access Control Note
- Only clergy/admin can change `assignedToUserId` or visibility scope.
- Parishioners can see assigned status but not reassign.
