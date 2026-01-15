# Tasks — Spec Pack (Board + Volunteer Flow)

## Current status
- **Implemented today:** List view with filters + CRUD actions for weekly tasks (`/tasks`). Files: `app/(app)/tasks/page.tsx`, `components/tasks/TasksView.tsx`, `lib/queries/tasks.ts`, `server/actions/tasks.ts`.
- **Gap:** No board view, claim/unclaim, or “open to volunteers” logic (A-015). No group-scoped board routes/components exist.

---

## A) UX spec

### Goals & primary flows
1. **Coordinators/Admins** create tasks on a board per group (or parish-wide).
2. **Parishioners** can **claim/unclaim** tasks marked “Open to volunteers.”
3. Tasks move across **To Do → In Progress → Done** with clear ownership.

### Key screens & states
- **Group task board**: `/groups/[groupId]/tasks`
  - Columns: To Do / In Progress / Done.
  - Task cards show title, owner/claim status, and “Open to volunteers” badge.
  - Empty states per column and overall.
- **Task detail drawer** (from board card)
  - Fields: title, notes, owner/assignee, due date (optional), volunteer toggle.
  - Actions: claim/unclaim (if volunteer-open), mark done, edit.
- **Parish-wide board** (optional): `/tasks/board` or `/groups/all/tasks`.

### Navigation entry points
- **From Groups list:** Group card menu → “View tasks.”
- **From Tasks list:** switcher to “Board.”

### Permission matrix (summary)
- **Admin/Shepherd:** create/edit any task, move columns, assign anyone.
- **Coordinator (Group Lead):** create/edit within group, move columns, assign within group.
- **Member:** can claim/unclaim volunteer-open tasks; can mark done only for tasks they own.

---

## B) Backend spec

### Domain model (delta from current schema)
> Minimal additions to unblock A-015 while keeping existing Task list intact.

- **Task**
  - Add `boardStatus` enum: `TODO`, `IN_PROGRESS`, `DONE` (default `TODO`).
  - Add `volunteerOpen` boolean (default `false`).
  - Add `claimedById` (nullable) relation to `User` for volunteer claim.
  - Optional: add `dueAt` and `priority` if needed for board UX.

### Required server actions
- `createBoardTask({ parishId, groupId?, title, notes?, volunteerOpen?, ownerId?, boardStatus? })`
  - Errors: `Unauthorized`, `Forbidden`, `ValidationError`.
- `updateBoardTask({ taskId, title?, notes?, boardStatus?, volunteerOpen?, ownerId? })`
- `claimTask({ taskId })` / `unclaimTask({ taskId })`
- `moveTask({ taskId, boardStatus })`

### Queries required per screen
- **Board view:** `listBoardTasks({ parishId, groupId?, actorUserId })`
  - Returns grouped tasks by `boardStatus` + ownership/claim state.
- **Task detail:** `getBoardTask({ taskId, actorUserId })`

### Authorization rules (server-side)
- Only Admin/Shepherd or Group Lead can edit tasks outside their ownership.
- Claim/unclaim allowed only when `volunteerOpen = true` and user has active membership.
- Parishioners cannot assign others or change group scope.

### Validation rules
- `title` required, `boardStatus` must be valid enum.
- `claimedById` must be cleared when `volunteerOpen = false`.
- Only one active claim at a time.

---

## C) Implementation plan (A-015 story breakdown)

### A-015a — Task board schema + queries
- **Scope:** Add `boardStatus`, `volunteerOpen`, `claimedById` to Task; add queries for board view.
- **Acceptance criteria:** Board query returns grouped tasks with claim state.
- **Test plan:** Integration test for `listBoardTasks` with seeded tasks + claims.
- **Files:** `prisma/schema.prisma`, `lib/queries/tasks.ts` (new board query), `tests/integration/task-board.test.ts`.

### A-015b — Board UI for group tasks
- **Scope:** `/groups/[groupId]/tasks` board route + UI columns + task cards.
- **Acceptance criteria:** Columns render with empty states; task cards show claim/owner.
- **Test plan:** Unit tests for board columns + card rendering.
- **Files:** `app/(app)/groups/[groupId]/tasks/page.tsx`, `components/tasks/board/*`.

### A-015c — Claim/unclaim + move flow
- **Scope:** Actions for claim/unclaim and move across columns; update permissions.
- **Acceptance criteria:** Claim/unclaim updates ownership and UI; permission errors handled.
- **Test plan:** Integration test for claim/unclaim + forbidden transitions.
- **Files:** `server/actions/tasks.ts`, `lib/permissions/index.ts`, `tests/integration/task-claim-flow.test.ts`.
