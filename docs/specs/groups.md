# Groups — Spec Pack (Direction A readiness)

## Overview
Groups provide ministry team organization with clear visibility, joining rules, and membership management. The Groups experience includes:
- Group list with visibility and join policy chips.
- Full CRUD (create, edit, archive/restore).
- Membership management with invites, join requests, and role changes.
- Members board with clear primary actions and a direct “Opportunities to Help” CTA.

---

## A) Group model

### Group fields
- **name** (string, required)
- **description** (string, optional)
- **visibility**: `PUBLIC | PRIVATE`
  - `PUBLIC`: visible to all parish users.
  - `PRIVATE`: visible only to members (and Admin/Clergy).
- **joinPolicy**: `INVITE_ONLY | OPEN | REQUEST_TO_JOIN`
  - `INVITE_ONLY`: only invitations can create memberships.
  - `OPEN`: self-join immediately creates an active membership.
  - `REQUEST_TO_JOIN`: self-join creates a request requiring approval.
- **archivedAt** (timestamp, nullable) for soft archive/restore.

---

## B) Membership model

### GroupMembership fields
- **userId**, **groupId**
- **role**: `COORDINATOR | PARISHIONER`
- **status**: `ACTIVE | INVITED | REQUESTED`
- **invitedEmail** (nullable)
- **invitedByUserId** (nullable)
- **approvedByUserId** (nullable)
- **createdAt**, **updatedAt**

### Status meanings
- **INVITED**: invited by a Coordinator or Admin/Clergy.
- **REQUESTED**: user submitted a request to join.
- **ACTIVE**: member is part of the group.

---

## C) Membership flows

### Invite flow
1. Coordinator/Admin invites by email.
2. Membership created or updated with `status=INVITED`.
3. Invited user accepts → `status=ACTIVE`.
4. Invited user declines → membership removed.

### Open join flow
1. User clicks “Join”.
2. Membership created or updated with `status=ACTIVE`.

### Request to join flow
1. User clicks “Request to join”.
2. Membership created with `status=REQUESTED`.
3. Coordinator/Admin approves → `status=ACTIVE`.
4. Coordinator/Admin denies → membership removed.

### Leave group flow
1. Active member chooses “Leave group”.
2. Membership removed.

---

## D) Permissions matrix

| Action | Admin/Clergy | Coordinator (group) | Parishioner (member) | Non-member |
|---|---|---|---|---|
| View PUBLIC group | ✅ | ✅ | ✅ | ✅ |
| View PRIVATE group | ✅ | ✅ | ✅ | ❌ |
| Edit group details | ✅ | ❌ | ❌ | ❌ |
| Archive/restore group | ✅ | ❌ | ❌ | ❌ |
| Invite members | ✅ | ✅ | ❌ | ❌ |
| Remove members | ✅ | ✅ | ❌ | ❌ |
| Change member roles | ✅ | ✅ | ❌ | ❌ |
| Approve/deny requests | ✅ | ✅ | ❌ | ❌ |
| Self-join OPEN | ✅ | ✅ | ✅ | ✅ |
| Self-request REQUEST_TO_JOIN | ✅ | ✅ | ✅ | ✅ |
| Leave group | ✅ | ✅ | ✅ | ❌ |

**Notes**
- Admin/Clergy are parish-wide and can manage any group regardless of membership.
- Coordinators manage membership for their group.
- Non-members cannot access PRIVATE groups or members list.

---

## E) UI surfaces

### Groups list
- Cards show name, description, visibility chip, member count.
- Join CTA for non-members:
  - `OPEN`: “Join”
  - `REQUEST_TO_JOIN`: “Request to join”
  - `INVITE_ONLY`: show “Invite only” label.
- Kebab menu:
  - Edit group (if Admin/Clergy)
  - Archive/Restore (if Admin/Clergy)
  - Manage members (if member or Admin/Clergy)

### Members page (Teams-inspired)
- Header includes group visibility and join policy chips.
- Primary actions:
  - Invite member (Admin/Clergy or Coordinator)
  - Leave group (members)
  - “Opportunities to Help” CTA (routes to group tasks board)
- Tabs:
  - **Members** (Active)
  - **Pending** (Invited + Requested)
- Row actions:
  - Remove, change role, approve/deny requests (Admin/Clergy or Coordinator)

---

## F) Server-side enforcement
- Visibility filtering on list queries and group detail access.
- Join policy enforcement on self-join actions.
- Admin/Clergy override for all membership management actions.
