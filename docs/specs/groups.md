# Groups — Spec Pack (Membership management + readiness for A-013)

## Current status
- **Implemented today:** Groups list with create/archive/restore and basic detail page (`/groups`, `/groups/[groupId]`). Files: `app/(app)/groups/page.tsx`, `components/groups/GroupsView.tsx`, `server/actions/groups.ts`, `app/(app)/groups/[groupId]/page.tsx`.
- **Gap:** No invite/accept/decline flow, no member management UI, and no role chips beyond read-only display.

---

## A) UX spec

### Goals & primary flows
1. **Leaders** create and manage group memberships.
2. **Members** can view their groups and see who’s on the team.
3. **Invited users** can accept/decline invites.

### Key screens & states
- **Group list** (`/groups`)
  - Existing list with “Create group.”
  - Add “Members” quick-link to manage membership.
- **Group detail** (`/groups/[groupId]`)
  - Members list with role chips and “Invite member” CTA.
  - Empty state when no members.
- **Invite drawer/modal**
  - Inputs: email, role, optional message.
  - States: sending, sent, failed.
- **Invite acceptance screen**
  - When a user follows an invite link, show accept/decline CTA.

### Navigation entry points
- Group card menu → “Manage members.”
- Group detail → “Invite member.”

### Permission matrix (summary)
- **Admin/Shepherd:** manage all group memberships.
- **Coordinator (Group Lead):** manage members for their group.
- **Member:** read-only.

---

## B) Backend spec

### Domain model (delta from current schema)
> Minimal additions to support invites + pending membership.

- **GroupMembership**
  - Add `status` enum: `PENDING`, `ACTIVE` (default `ACTIVE`).
  - Add `invitedById` (nullable) relation to `User`.
- **GroupInvite** (new model)
  - `id`, `groupId`, `email`, `role`, `token`, `status`, `createdAt`, `expiresAt`, `invitedById`.

### Required server actions
- `inviteGroupMember({ groupId, email, role })`
- `acceptGroupInvite({ token })`
- `declineGroupInvite({ token })`
- `updateGroupMemberRole({ groupId, userId, role })`
- `removeGroupMember({ groupId, userId })`

### Queries required per screen
- `getGroupMembers({ groupId, actorUserId })` → members + roles + status.
- `getPendingInvites({ groupId, actorUserId })`.

### Authorization rules
- Admin/Shepherd: full access.
- Group Lead: manage members within the group.
- Member: read-only (no invite/remove).

---

## C) Implementation plan (A-013 story breakdown)

### A-013a — Group membership data + invite model
- **Scope:** Add `GroupInvite` model and `GroupMembership.status`.
- **Acceptance criteria:** Invites can be stored and queried; membership status persists.
- **Tests:** Integration tests for invite + accept flow.

### A-013b — Membership management UI
- **Scope:** Group detail view includes members list, role chips, and invite drawer.
- **Acceptance criteria:** Leaders can invite/change roles/remove members with proper feedback.
- **Tests:** Unit tests for member row and invite drawer states.

### A-013c — Invite acceptance UX
- **Scope:** Public-facing invite acceptance page.
- **Acceptance criteria:** Invite link allows accept/decline with clear state messaging.
- **Tests:** Integration tests for accept/decline.
