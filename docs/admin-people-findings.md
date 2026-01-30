# Admin People — Naming & DB Conventions + Findings

## Phase 0 — Naming & DB Conventions

### Prisma conventions
- **Model naming:** singular, PascalCase models (e.g., `Parish`, `User`, `Membership`, `AccessRequest`).
- **Field naming:** camelCase fields with explicit relation ids like `parishId`, `userId`, `createdAt` (e.g., `Membership.parishId`, `Membership.userId`).
- **Enum naming/values:** PascalCase enum names with ALL_CAPS values (e.g., `ParishRole { ADMIN, SHEPHERD, MEMBER }`, `GroupMembershipStatus { INVITED, REQUESTED, ACTIVE }`).
- **Relation naming:** plural relations on parents (e.g., `Parish.memberships`, `User.memberships`, `Group.groupMemberships`), and specific relation names for multiple relations (e.g., `GroupMembership` has `@relation("GroupInviteActor")`).

### Database conventions
- **Table naming:** default Prisma table naming (no `@@map` or `@map` usage in `schema.prisma`).
- **Indexes:** explicit `@@unique` and `@@index` declarations without custom index names (e.g., `@@unique([parishId, userId])` on `Membership`).
- **Soft delete:** no global soft-delete field; uses `archivedAt` on some models (e.g., `Group.archivedAt`, `Task.archivedAt`) but `Membership` has no `deletedAt`/`revokedAt`.
- **Migrations:** timestamp + slug folders (e.g., `20260510120000_add_access_requests`).

### Query/action conventions
- **Queries:** colocated in `lib/queries/*` (e.g., `lib/queries/groups.ts`, `lib/queries/members.ts`).
- **Server actions:** split between `server/actions/*` and `app/actions/*` depending on feature area (e.g., `server/actions/tasks.ts`, `app/actions/members.ts`).
- **Types/validation:** action return types live in `lib/types/*`, validation schemas in `lib/validation/*` with Zod.

## Phase 1 — Findings

### Models + role enums
- **Parish membership:** `Membership` model (`parishId`, `userId`, `role: ParishRole`).
- **User model:** `User` with `memberships` relation and `activeParishId` for current parish.
- **Roles:** `ParishRole` enum with `ADMIN`, `SHEPHERD`, `MEMBER`.
- **Access requests:** `AccessRequest` model with `status: AccessRequestStatus` and `createdAt`/`updatedAt`.
- **Group membership & invites:** `GroupMembership` with `status: GroupMembershipStatus` plus `invitedByUserId`/`invitedEmail` fields.

### Permission helpers
- `server/auth/permissions.ts`: `requireAdminOrShepherd(userId, parishId)` and `assertActiveSession()`.
- `lib/authz/membership.ts`: `isAdminClergy(role)` helper for ADMIN/SHEPHERD.
- `lib/permissions/index.ts`: `isParishLeader(role)` with ADMIN/SHEPHERD.

### Current parish resolution
- Uses `session.user.activeParishId` (set in auth callbacks) and `getAccessGateState()` for access gating; layout resolves parish as `access.parishId ?? session.user.activeParishId`.

### Where queries/actions live
- Queries in `lib/queries/*` (e.g., `lib/queries/groups.ts`, `lib/queries/members.ts`).
- Actions in `server/actions/*` (tasks, groups, announcements) and `app/actions/*` (membership/access flows).
