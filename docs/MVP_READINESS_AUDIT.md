# Paxora Parish Center — MVP Readiness Audit

Author: Internal Code Audit  
Scope: Full Paxora Codebase Review  
Date: 2026-02-16  
Status: Pre-MVP Security & Stability Review

## Architecture Analysis Summary

Data Layer: Prisma with PostgreSQL. Well-structured models with proper relationships. Parish-scoped parishId on most models. Soft-delete via deletedAt/archivedAt. Recurring events use recurrenceFreq/recurrenceByWeekday/recurrenceUntil with in-memory expansion.
Permissions: Centralized in lib/permissions/index.ts (thin helpers) + lib/authz/membership.ts. Every server action independently validates session + parish membership. Role hierarchy: ADMIN > SHEPHERD > MEMBER. Group roles: COORDINATOR > PARISHIONER.
Notifications: Dual system — in-app (Prisma Notification model) + web push (VAPID). Per-type preferences on User model (notifyMessageInApp, etc.). Fire-and-forget push calls with .catch(() => {}).
i18n: English (en), Ukrainian (uk), Spanish (es placeholder). Uses a custom provider/translator pattern with JSON message files. Locale stored in cookie + URL segment.
Chat: Channel-based (PARISH, GROUP, ANNOUNCEMENT). Supports message edit/delete (24h window for authors, unlimited for moderators), reactions, polls, threaded replies, mentions, attachments, and pinned messages. Polling-based updates (no WebSocket/SSE).

## Critical MVP Gaps

### RED — Launch Blockers

R1. Cron endpoints lack authentication app/api/cron/event-reminders/route.ts (and all cron routes) have no auth check — anyone can trigger them by hitting the URL.
	•	Risk: Spam notifications, resource exhaustion
	•	Fix: Add CRON_SECRET header check (standard Vercel cron pattern)
R2. No audit trail for admin actions Group archival, deletion, member removal, role changes, task approval/rejection, event deletion — none are logged. There is no AuditLog model in the schema.
	•	Risk: Zero accountability. If an admin removes a member or deletes a group, there's no record.
	•	Fix: Add a lightweight AuditLog model (actor, action, targetType, targetId, metadata, createdAt) and log critical mutations.
R3. listGroups server action returns ALL groups without visibility filtering server/actions/groups.ts:71-86(listGroups) returns all groups in the parish with no visibility check. The query-layer lib/queries/groups.ts does filter properly, but this separate action is exposed.
	•	Risk: PRIVATE groups leaked through this action (used by the AppHeader "Add" dropdown)
	•	Fix: Add visibility filtering or consolidate into the query layer's filtered listGroups.
R4. Group chat channel not auto-created on group creation When a group is created (createGroupInternal), no chat channel is created. The chat channel appears to be created separately, but there's no guarantee of atomicity. If the channel creation fails, the group exists without chat.
	•	Risk: Groups with broken chat
	•	Fix: Create the ChatChannel inside the createGroupInternal transaction.
R5. Push notifications leak message content notifyChatMessage sends the truncated message body in the push notification payload. For GROUP channels of PRIVATE groups, this means the message text is visible on lock screens of all group members.
	•	Risk: Sensitive pastoral conversations visible on lock screens
	•	Fix: For private/group channels, use generic text like "New message in [Group Name]" instead of the message body. Let the user choose notification detail level.
R6. Event deletion is a hard delete deleteEvent runs prisma.event.delete() — no soft delete, no confirmation audit.
	•	Risk: Permanent data loss with no recovery path
	•	Fix: Add deletedAt soft-delete pattern, or at minimum log the deletion in an audit table.
R7. rolloverTasksForWeek has no permission check beyond session auth server/actions/tasks.ts:791-812 — any parish member can rollover tasks between weeks.
	•	Risk: A regular member could manipulate the serve board
	•	Fix: Add isParishLeader check.

### YELLOW — Important for Professional Release

Y1. No race condition protection on group membership operations joinGroup, requestToJoin, acceptInvite all check-then-update without transactions. Two rapid clicks could create duplicate memberships.
	•	Fix: Wrap check + upsert in $transaction with SELECT FOR UPDATE pattern, or rely on the existing unique constraint (which does protect at DB level but gives ugly errors).
Y2. Hardcoded English strings in UI components Found throughout: "Cancel", "Save", "Filters", "No matching parish members.", "Add members", etc. in GroupCreateDialog, EventForm, TaskCreateDialog, HeaderActionBar.
	•	Fix: Replace with t() calls. Not all strings need i18n for MVP, but user-facing button text and labels should.
Y3. getGroupDetail visibility check is incomplete server/actions/groups.ts:569-574: For non-leaders, it checks visibility === "PUBLIC" || groupMembership?.status === "ACTIVE". But a user with REQUESTED or INVITEDstatus who navigates directly to a PRIVATE group detail URL can get a 403. The error message is just "Unauthorized" — should be a user-friendly "Group not found" to avoid leaking existence.
Y4. updateGroupMembership uses the old pattern server/actions/groups.ts:632-723 duplicates logic that now lives in app/actions/members.ts. This creates two code paths for the same operation with different permission rules.
	•	Fix: Deprecate or redirect to the canonical members.ts actions.
Y5. Missing confirmation patterns for destructive actions Group deletion, task deletion, event deletion, member removal — all execute immediately without client-side confirmation beyond a single button click.
	•	Fix: Add confirmation modals for irreversible actions (delete group, delete event, remove member).
Y6. Calendar surface state variable exists but the UI toggle for "schedule" view is not rendered CalendarView.tsxhas surface state (calendar | schedule) but the toggle is missing from the UI — the schedule view is unreachable without direct state manipulation.
	•	Fix: Add a surface toggle or remove dead code.
Y7. Notification preferences only control in-app notifications User model has notifyMessageInApp, notifyTaskInApp, etc. but no corresponding push notification preferences. Users can't opt out of push notifications per category.
	•	Fix: Add notifyMessagePush, notifyTaskPush, etc. fields and check them in lib/push/notify.ts.
Y8. Empty state handling inconsistencies
	•	Calendar shows empty state for filtered results but doesn't suggest clearing filters
	•	Tasks page empty state varies between view modes
	•	Groups page has no "create your first group" empty state for leaders
	•	Fix: Audit all empty states for consistent messaging and actionable CTAs.

### GREEN — Post-MVP Polish

G1. Chat uses polling (page refresh / client refetch) — no real-time. Acceptable for MVP but noticeable in active conversations.
G2. No image optimization pipeline for chat attachments or group avatars — served raw.
G3. No rate limiting on server actions beyond the monthly group creation limit (4/month).
G4. as any casts in Prisma queries (groups.ts:165, groups.ts:416, groups.ts:450, groups.ts:482) — indicates schema drift or TypeScript workarounds that should be resolved.
G5. The recurrence expansion algorithm loads all recurring events that started before range end, which scales poorly as the event table grows.
G6. Spanish locale (es.json) exists as a placeholder but isn't in the active locales array — consistent with the catalog approach but could confuse translators.

## UX & Product Coherence Audit

Does Paxora feel like one cohesive product?
Mostly yes, with gaps. The emerald gradient headers, card-based layouts, and consistent typography create a recognizable brand. The recent HeaderActionBar unification helps. But:
	1	Navigation is consistent — mobile bottom tabs + sidebar on desktop. The "More" drawer handles overflow well.
	2	Mental model clarity by role:
	◦	Parishioner: Clear. See public events, join open groups, view tasks. Creation requests are intuitive.
	◦	Group Coordinator: Good. Can manage members, post in group chat, create group events.
	◦	Clergy (Shepherd): Same as Admin functionally. The distinction exists in the schema but isn't surfaced in the UI — could confuse clergy who expect different capabilities.
	◦	Admin: Full control. The AppHeader with week selector and "+ Add" dropdown is admin-only and clear.
	3	Join states are mostly obvious — Group cards show "Join", "Request to Join", "Pending", "Invited" badges. But the invite-only state for non-members shows no affordance (correct, but a "Request invite" or "Contact coordinator" suggestion would help).
	4	Creation flow is improved with the recent refactor (fieldsets, autofocus, smart defaults). The remaining friction: event creation requires choosing between Service and Event type first, which isn't always clear to parish users.
	5	Filters are now consistent across Calendar, Groups, and Tasks via HeaderActionBar. Calendar gained filters it was missing.
	6	Hierarchy communication: The app doesn't clearly show "you're an admin" or "you're a coordinator of this group" in the UI chrome. Role badges exist on member lists but not in the user's own view.

## Security & Governance Check

### Chat Security

	•	Adequate for MVP: Messages are stored in plaintext in PostgreSQL (no E2E encryption). Access is properly scoped per channel via requireChannelAccess. Message edit/delete has a 24h window. Moderators can override. Soft-delete preserves message records.
	•	Concern: Attachment URLs use path-based routing (/api/chat/images/chat/...). The path traversal check (url.includes("..")) is present but basic. The image serving route should validate that the requesting user has access to the channel the attachment belongs to.

### Role-Based Access

	•	Properly parish-scoped: Every server action validates session.user.activeParishId against the target entity's parishId. Cross-parish access is blocked.
	•	Role escalation: No path found for a MEMBER to escalate to SHEPHERD/ADMIN. Role changes require leader permissions. Group COORDINATOR role is separate from parish role.

### Hidden Groups

	•	Mostly hidden: lib/queries/groups.ts filters private groups from non-members. But: server/actions/groups.ts:listGroups (line 71-86) does NOT filter — returns all groups. This is the R3 finding above.
	•	Chat history API (/api/chat/[channelId]/history) checks against listChannelsForUser which respects group membership. Properly secured.

### Admin Action Logging

	•	Not implemented. No AuditLog model. No logging of: group creation/deletion, member removal, role changes, event deletion, task approval/rejection. This is the R2 finding.

### Push Notification Content

	•	Leaks message body: Both chat messages and mentions include truncated message text in push payloads. For sensitive conversations (private groups, pastoral care), this is a privacy concern. See R5.

### Enumeration Protection

	•	Groups: Private groups not returned to non-members in the query layer (with the R3 exception). Direct navigation to /groups/[id] returns "Unauthorized" which does leak existence — should return 404 pattern.
	•	Users: The mention user API (/api/mentions/users) returns all parish members. Acceptable for parish context. The invite candidate list is similarly scoped.

## Deliverables

### 1. Prioritized MVP Readiness Checklist

#
Item
Severity
Effort
R1
Auth-protect cron endpoints — DONE (Ready for review)
BLOCKER
1h
R2
Add AuditLog model + log critical mutations
BLOCKER
4h
R3
Fix listGroups server action visibility leak
BLOCKER
30min
R5
Sanitize push notification content for private channels
BLOCKER
2h
R6
Soft-delete events instead of hard delete
BLOCKER
1h
R7
Add permission check to rolloverTasksForWeek
BLOCKER
15min
R4
Auto-create chat channel in group creation transaction
BLOCKER
1h
Y1
Add transaction safety to membership operations
IMPORTANT
2h
Y3
Return 404 (not 403) for hidden group detail access
IMPORTANT
30min
Y4
Consolidate duplicate updateGroupMembership
IMPORTANT
1h
Y5
Add confirmation modals for destructive actions
IMPORTANT
3h
Y6
Fix or remove unreachable schedule surface toggle
IMPORTANT
30min
Y7
Add per-type push notification preferences
IMPORTANT
3h
Y8
Audit and fix empty states
IMPORTANT
2h
Y2
Replace hardcoded English strings with t() calls
IMPORTANT
4h

## Launch Blockers

2. Launch Blockers (must fix before any real parish deployment)
	1	Cron endpoints are public (R1) — Resolved (Ready for review)
	2	No audit trail (R2) — admins can delete groups/events with zero accountability
	3	Private group leak (R3) — listGroups server action exposes all groups
	4	Push content leak (R5) — private messages visible on lock screens
	5	Hard event deletion (R6) — accidental deletion = permanent data loss
	6	Missing permission on task rollover (R7) — any member can manipulate the serve board
	7	Group chat channel not atomically created (R4) — groups can exist without chat

## Two-Week Action Plan

3. "Fix in 2 Weeks" Action Plan
Week 1 (Days 1-5): Security & Data Integrity
	•	Day 1: R1 (cron auth), R7 (rollover perms), R3 (listGroups fix) — all small fixes
	•	Day 2: R2 — Design and implement AuditLog model + migration. Wire into group delete, event delete, member remove, role change, task approve/reject
	•	Day 3: R5 — Sanitize push content. R6 — Soft-delete events
	•	Day 4: R4 — Atomic chat channel creation. Y1 — Transaction safety for membership operations
	•	Day 5: Y3 — 404 for hidden groups. Y4 — Consolidate duplicate membership logic. Testing.
Week 2 (Days 6-10): UX & Polish
	•	Day 6: Y5 — Confirmation modals for destructive actions (delete group, delete event, remove member)
	•	Day 7: Y6 — Fix schedule surface toggle. Y8 — Audit all empty states
	•	Day 8-9: Y2 — i18n sweep: replace hardcoded strings in create dialogs, HeaderActionBar, filter drawer
	•	Day 10: Y7 — Push notification preferences. Integration testing. Regression check.

## Technical Refactor Recommendations

4. Technical Refactor Recommendations
	1	Consolidate permission helpers: lib/permissions/index.ts and lib/authz/membership.ts both have role-checking functions. Merge into a single module.
	2	Eliminate as any Prisma casts: The 4 instances in groups.ts suggest the Prisma client types are out of sync with the schema. Run prisma generate and fix the types.
	3	Standardize server action patterns: Some actions use assertSession + throw (groups, chat), others use requireSession + error return objects (members). Pick one pattern.
	4	Remove updateGroupMembership from server/actions/groups.ts — it duplicates app/actions/members.tswith weaker permission checks.
	5	Extract assertActorContext pattern into a shared utility — it's duplicated across groups.ts, events.ts, tasks.ts.

## UX Coherence Summary

5. UX Coherence Summary
Strengths:
	•	Consistent visual language (emerald gradients, card system, mist backgrounds)
	•	Unified HeaderActionBar across Serve/Groups/Calendar
	•	Clear parishioner vs. leader UI differentiation via AppHeader / PageHeader
	•	Mobile-first with proper bottom sheet drawers
Gaps:
	•	No role badge in the user's own navigation/profile area
	•	Clergy vs. Admin distinction unused in UI
	•	Schedule view is orphaned (no toggle)
	•	Empty states vary in tone and actionability
	•	Some create dialogs still use hardcoded English despite i18n infrastructure

## Security Risk Summary

6. Security Risk Summary
Risk
Severity
Status
Cron endpoints unauthenticated
CRITICAL
Done (Ready for review)
Private group names leaked via listGroups action
HIGH
Open
Push notifications expose message content
HIGH
Open
Hard event deletion (no recovery)
HIGH
Open
No admin audit trail
HIGH
Open
Task rollover missing permission check
MEDIUM
Open
Group detail returns 403 (leaks existence)
LOW
Open
Chat attachments - basic path traversal check only
LOW
Acceptable for MVP
No E2E encryption for chat
LOW
Expected for MVP
No rate limiting on server actions
LOW
Acceptable for MVP

## Suggested Implementation Order

7. Suggested Implementation Order
1. R1  — Cron auth             (Completed, ready for review)
2. R7  — Rollover perms        (15 min)
3. R3  — listGroups fix        (30 min)
4. R6  — Soft-delete events    (1 hr)
5. R5  — Push content sanitize (2 hr)
6. R2  — AuditLog model        (4 hr)
7. R4  — Atomic chat channel   (1 hr)
8. Y3  — 404 for hidden groups (30 min)
9. Y4  — Consolidate members   (1 hr)
10. Y1 — Transaction safety     (2 hr)
11. Y5 — Confirmation modals    (3 hr)
12. Y6 — Schedule toggle fix    (30 min)
13. Y8 — Empty states audit     (2 hr)
14. Y2 — i18n hardcoded strings (4 hr)
15. Y7 — Push preferences       (3 hr)
Total estimated effort: ~25 hours of focused development for all blockers + important items.

This analysis is based on direct reading of every critical file in the codebase. The findings are concrete and actionable. Shall I begin implementing the fixes, starting with the launch blockers?
