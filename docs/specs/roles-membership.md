# A-013 Roles + membership plan

## Current state (Phase 0 findings)
- Parish-level roles already exist in Prisma as `ParishRole` (`ADMIN`, `SHEPHERD`, `MEMBER`) with `Membership` linking `User` to `Parish`.【F:prisma/schema.prisma†L13-L71】
- Group membership exists as `GroupMembership` with `GroupRole` (`LEAD`, `MEMBER`) and no invite workflow originally.【F:prisma/schema.prisma†L16-L119】
- Access gate uses `Membership` to decide approval and role; approvals are issued by parish leaders only.【F:lib/queries/access.ts†L27-L106】【F:app/actions/access.ts†L69-L143】
- Group detail page already lists members and tasks, but lacked role management and invites before A-013.【F:app/(app)/groups/[groupId]/page.tsx†L24-L133】

## Implemented model (A-013)
- Parish-level roles map to A-013:
  - `ADMIN` / `SHEPHERD` → **Admin/Clergy** (global, parish-wide)
  - `MEMBER` → **Parishioner** (default on approval)
- `GroupMembership` now includes:
  - `status`: `INVITED` | `ACTIVE`
  - `invitedByUserId`, `invitedEmail`
  - timestamps (`createdAt`, `updatedAt`)

## Permissions matrix
| Action | Admin/Clergy | Coordinator (group LEAD) | Parishioner (group MEMBER) |
| --- | --- | --- | --- |
| View group members | ✅ | ✅ | ✅ (if member or invited) |
| Invite member | ✅ | ✅ | ❌ |
| Change role | ✅ | ✅ | ❌ |
| Remove member | ✅ | ✅ | ❌ |
| Accept/decline invite | ✅ (self only) | ✅ (self only) | ✅ (self only) |

## Implemented flow
1. **Authz helpers**: `lib/authz/membership.ts` enforces admin/clergy or coordinator checks.
2. **Queries**: `lib/queries/members.ts` returns active members and pending invites.
3. **Server actions**: `app/actions/members.ts` supports invite, accept/decline, role change, remove.
4. **UI**: `/groups/[id]/members` page with role chips, invite drawer, and pending invites.
5. **Access gating**: approvals default to parishioner if role is omitted; UI labels reflect “Parishioner/Clergy/Admin.”

## Tests
- Unit: `tests/unit/member-role-chip.test.tsx`
- Integration: `tests/integration/group-membership.test.ts`
