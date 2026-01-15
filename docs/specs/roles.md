# Roles & Membership — Spec Pack (A-013 backbone)

## Current status
- **Schema:** `ParishRole` enum (ADMIN/SHEPHERD/MEMBER) and `GroupRole` enum (LEAD/MEMBER) exist in `prisma/schema.prisma`.
- **Permissions helpers:** `lib/permissions/index.ts` only exposes `isParishLeader` and `canManageGroupMembership`.
- **Gap:** No Coordinator role, no invite/request status, and no permissions matrix covering A-013/A-014/A-015/A-016.

---

## A) UX spec

### Goals & primary flows
1. **Access request + approval** for new users (A-012.5).
2. **Role-based permissions** for group tasks, chat moderation, and recognition.
3. **Clear role badges** across group/member views.

### Key screens & states
- **Access request page** (new): request access / pending / approved states.
- **Members list** with role chips and permissions hints.
- **Role change drawer** for Admin/Shepherd or Group Lead.

### Permission matrix (role x capability)
| Capability | Admin/Shepherd | Coordinator (Group Lead) | Member |
| --- | --- | --- | --- |
| Manage parish memberships | ✅ | ❌ | ❌ |
| Manage group memberships | ✅ | ✅ (own group) | ❌ |
| Create tasks (group) | ✅ | ✅ | ❌ |
| Claim volunteer tasks | ✅ | ✅ | ✅ |
| Move tasks across board | ✅ | ✅ | ✅ (own tasks only) |
| Moderate chat (delete/pin/lock) | ✅ | ✅ (own group rooms) | ❌ |
| Nominate weekly hero | ✅ | ✅ (own group) | ❌ |

---

## B) Backend spec

### Domain model (delta from current schema)
> Minimal additions to support access gating + role enforcement.

- **Membership**
  - Add `status` enum: `PENDING`, `ACTIVE`, `REJECTED` (default `PENDING`).
  - Add `requestedAt`, `approvedAt`, `approvedById`.
- **GroupMembership**
  - Add `status` enum: `PENDING`, `ACTIVE` (default `ACTIVE`).
- **Role mapping**
  - Treat `GroupRole.LEAD` as **Coordinator** for A-013 (or add a `COORDINATOR` alias if desired).

### Required server actions
- `requestParishAccess()` → creates Membership with `PENDING`.
- `approveParishAccess({ membershipId })` / `rejectParishAccess({ membershipId })`.
- `updateParishRole({ membershipId, role })`.
- `updateGroupRole({ groupId, userId, role })`.

### Queries required per screen
- `getAccessState({ userId })` → { status, membership, activeParishId }.
- `listParishMembers({ parishId })` → members + roles + status.
- `listGroupMembers({ groupId })` → members + roles + status.

### Authorization rules
- **Parish-wide actions**: Admin/Shepherd only.
- **Group-specific actions**: Group Lead or parish leader.
- **Member**: read-only access until status = ACTIVE.

---

## C) Implementation plan (A-012.5 + A-013 breakdown)

### A-012.5a — Access request state
- **Scope:** Add Membership.status and access state query; add `/access` page.
- **Acceptance criteria:** Users without ACTIVE membership see request/pending UI.
- **Tests:** Unit test for access gate; integration test for request/approve.

### A-013a — Roles + permissions matrix
- **Scope:** Expand `lib/permissions` to map roles to capabilities.
- **Acceptance criteria:** Server actions enforce role checks per capability.
- **Tests:** Unit tests for permissions matrix.

### A-013b — Membership admin UI
- **Scope:** Add member list + role management UI for parish leaders.
- **Acceptance criteria:** Role changes persist and show in UI.
- **Tests:** Integration tests for role change workflow.
