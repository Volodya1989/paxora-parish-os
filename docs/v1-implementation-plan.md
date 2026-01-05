# Paxora Parish OS — V1 Implementation Plan

## A) Repo Structure (Next.js App Router)

**Proposed structure**
```
/
├── app/
│   ├── (auth)/
│   │   ├── sign-in/
│   │   └── sign-up/
│   ├── (app)/
│   │   ├── this-week/
│   │   ├── groups/
│   │   ├── tasks/
│   │   ├── calendar/
│   │   └── digest/
│   ├── api/
│   │   └── webhooks/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/
│   └── shared/
├── domain/
│   ├── week/
│   ├── tasks/
│   ├── groups/
│   ├── calendar/
│   └── digest/
├── server/
│   ├── actions/
│   ├── auth/
│   └── db/
├── lib/
│   ├── date/
│   ├── permissions/
│   └── validation/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── tests/
│   ├── unit/
│   └── integration/
└── middleware.ts
```

**Separation of concerns**
- **Domain logic** lives in `domain/` (week/task rules, rollovers, digest computation).
- **UI components** live in `components/` and page-level layouts in `app/`.
- **Server actions / route handlers** live in `server/actions` and `app/api`.
- **DB access** lives in `server/db` with Prisma client wrappers and query functions.
- **Tests** live in `tests/` (unit tests for domain logic, integration tests for server actions).

## B) Domain Model (Week-first)

**Choice: Prisma + PostgreSQL**
- **Why Prisma:** stable schema/migration tooling, strong typing for Next.js, straightforward relation modeling.

**Auth choice: NextAuth.js (Auth.js) with Prisma adapter**
- **Why NextAuth.js:** proven Next.js integration, supports email/password or magic links, minimal setup for small teams.

### Entities

#### 1) Parish (Organization)
- **Purpose:** tenant boundary for all data.
- **Key fields:** `id`, `name`, `slug`, `createdAt`.
- **Constraints:** `slug` unique.
- **Relationships:** has many `Users`, `Groups`, `Weeks`, `Tasks`, `Events`, `Digests`.

#### 2) User
- **Purpose:** parish member using the system.
- **Key fields:** `id`, `email`, `name`, `createdAt`.
- **Constraints:** `email` unique.
- **Relationships:** belongs to many `Parishes` via `Membership`; belongs to many `Groups` via `GroupMembership`; owns many `Tasks`.

#### 3) Membership / Role (Parish)
- **Purpose:** link users to parish with role.
- **Key fields:** `id`, `parishId`, `userId`, `role` (ADMIN, SHEPHERD, MEMBER).
- **Constraints:** unique (`parishId`, `userId`).
- **Relationships:** belongs to `Parish` and `User`.

#### 4) Week
- **Purpose:** canonical time unit.
- **Key fields:** `id`, `parishId`, `startsOn`, `endsOn`, `label`, `createdAt`.
- **Constraints:** unique (`parishId`, `startsOn`), index on `parishId + startsOn`.
- **Relationships:** has many `Tasks`, `Events`, `Digests`.

#### 5) Group
- **Purpose:** ministry or circle of responsibility.
- **Key fields:** `id`, `parishId`, `name`, `description`, `createdAt`.
- **Constraints:** unique (`parishId`, `name`).
- **Relationships:** has many `GroupMembership` and `Tasks`.

#### 6) GroupMembership
- **Purpose:** link users to groups with role.
- **Key fields:** `id`, `groupId`, `userId`, `role` (LEAD, MEMBER).
- **Constraints:** unique (`groupId`, `userId`).
- **Relationships:** belongs to `Group` and `User`.

#### 7) Task
- **Purpose:** weekly responsibility item.
- **Key fields:** `id`, `parishId`, `weekId`, `groupId` (optional), `ownerId`, `title`, `notes`, `status` (OPEN, DONE), `createdAt`, `completedAt`, `rolledFromTaskId` (optional).
- **Constraints:** index on `weekId`, index on `ownerId`, index on `groupId`.
- **Relationships:** belongs to `Week`, `User`, optional `Group`.

#### 8) Event
- **Purpose:** calendar context only (not full scheduling).
- **Key fields:** `id`, `parishId`, `weekId`, `title`, `startsAt`, `endsAt`, `location`.
- **Constraints:** index on `weekId`, index on `parishId + startsAt`.
- **Relationships:** belongs to `Week`.

#### 9) Digest
- **Purpose:** weekly summary record (stored for stability).
- **Decision:** **stored record** to ensure the weekly digest is stable and reviewable.
- **Key fields:** `id`, `parishId`, `weekId`, `content`, `status` (DRAFT, PUBLISHED), `createdById`, `publishedAt`.
- **Constraints:** unique (`parishId`, `weekId`).
- **Relationships:** belongs to `Week` and `User`.

## C) Database Schema (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum ParishRole {
  ADMIN
  SHEPHERD
  MEMBER
}

enum GroupRole {
  LEAD
  MEMBER
}

enum TaskStatus {
  OPEN
  DONE
}

enum DigestStatus {
  DRAFT
  PUBLISHED
}

model Parish {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  createdAt DateTime @default(now())

  memberships Membership[]
  groups      Group[]
  weeks       Week[]
  tasks       Task[]
  events      Event[]
  digests     Digest[]
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())

  memberships      Membership[]
  groupMemberships GroupMembership[]
  tasks            Task[] @relation("TaskOwner")
  digestsCreated   Digest[] @relation("DigestAuthor")
}

model Membership {
  id       String     @id @default(cuid())
  parishId String
  userId   String
  role     ParishRole @default(MEMBER)

  parish Parish @relation(fields: [parishId], references: [id])
  user   User   @relation(fields: [userId], references: [id])

  @@unique([parishId, userId])
}

model Week {
  id        String   @id @default(cuid())
  parishId  String
  startsOn  DateTime
  endsOn    DateTime
  label     String
  createdAt DateTime @default(now())

  parish Parish  @relation(fields: [parishId], references: [id])
  tasks  Task[]
  events Event[]
  digest Digest?

  @@unique([parishId, startsOn])
  @@index([parishId, startsOn])
}

model Group {
  id          String   @id @default(cuid())
  parishId    String
  name        String
  description String?
  createdAt   DateTime @default(now())

  parish       Parish            @relation(fields: [parishId], references: [id])
  memberships GroupMembership[]
  tasks        Task[]

  @@unique([parishId, name])
}

model GroupMembership {
  id      String    @id @default(cuid())
  groupId String
  userId  String
  role    GroupRole @default(MEMBER)

  group Group @relation(fields: [groupId], references: [id])
  user  User  @relation(fields: [userId], references: [id])

  @@unique([groupId, userId])
}

model Task {
  id               String     @id @default(cuid())
  parishId         String
  weekId           String
  groupId          String?
  ownerId          String
  title            String
  notes            String?
  status           TaskStatus @default(OPEN)
  createdAt        DateTime   @default(now())
  completedAt      DateTime?
  rolledFromTaskId String?

  parish Parish @relation(fields: [parishId], references: [id])
  week   Week   @relation(fields: [weekId], references: [id])
  group  Group? @relation(fields: [groupId], references: [id])
  owner  User   @relation("TaskOwner", fields: [ownerId], references: [id])

  @@index([weekId])
  @@index([ownerId])
  @@index([groupId])
  @@index([parishId, weekId])
}

model Event {
  id        String   @id @default(cuid())
  parishId  String
  weekId    String
  title     String
  startsAt  DateTime
  endsAt    DateTime
  location  String?

  parish Parish @relation(fields: [parishId], references: [id])
  week   Week   @relation(fields: [weekId], references: [id])

  @@index([weekId])
  @@index([parishId, startsAt])
}

model Digest {
  id          String       @id @default(cuid())
  parishId    String
  weekId      String @unique
  content     String
  status      DigestStatus @default(DRAFT)
  createdById String
  publishedAt DateTime?

  parish Parish @relation(fields: [parishId], references: [id])
  week   Week   @relation(fields: [weekId], references: [id])
  author User   @relation("DigestAuthor", fields: [createdById], references: [id])

  @@unique([parishId, weekId])
  @@index([parishId, weekId])
}
```

**Indexes for common queries**
- **This Week loading:** `Week.parishId + startsOn`, `Task.parishId + weekId`, `Event.weekId`.
- **Tasks by week:** `Task.weekId`, `Task.parishId + weekId`.
- **Rollover logic:** `Task.parishId + weekId` (find open tasks for previous week).
- **Group membership:** `GroupMembership.groupId`, `GroupMembership.userId`.

## D) Core Business Logic (Deterministic)

**Current week determination**
- Week start day: **Monday** (00:00 local parish time).
- The current week is the week whose `startsOn <= now < endsOn` for the parish timezone.
- Store parish timezone in `Parish` (if needed later). V1 can default to a single timezone configured at deployment.

**Week creation**
- Create **on demand** when the first request for a week is made.
- If the current week does not exist for the parish, create it and pre-create **next week**.
- Week label example: `2024-W36`.

**Task rollover algorithm**
- Triggered when a new week is created (or first request to new week).
- Steps:
  1. Find all `OPEN` tasks from the previous week.
  2. For each, create a new task in the current week with `rolledFromTaskId` set.
  3. Original task remains `OPEN` (historical) or can be set to `DONE` with `completedAt` as rollover time; V1 keeps it `OPEN` for traceability.
- Rollover runs once per week per parish (idempotent by checking `rolledFromTaskId`).

**Permissions model**
- **Parish roles:**
  - `ADMIN`: manage all entities, memberships, and tasks.
  - `SHEPHERD`: create tasks/events, manage digest, view all tasks.
  - `MEMBER`: view assigned tasks, mark own tasks done, view groups/events.
- **Group roles:**
  - `LEAD`: create tasks for group, manage group membership (within parish permissions).
  - `MEMBER`: view group tasks.

**Weekly Digest generation**
- Computed from week data, then stored as `Digest` record.
- The digest content is a **snapshot** of:
  - This Week summary
  - Open tasks and owners
  - Events list
- Drafts can be edited; publishing sets `status = PUBLISHED` and `publishedAt`.

## E) API / Server Actions Contract

**TypeScript interfaces (shared)**
```ts
export interface WeekSummary {
  weekId: string;
  startsOn: string;
  endsOn: string;
  label: string;
}

export interface TaskDTO {
  id: string;
  title: string;
  notes?: string;
  status: "OPEN" | "DONE";
  ownerId: string;
  groupId?: string;
  weekId: string;
}

export interface GroupDTO {
  id: string;
  name: string;
  description?: string;
}

export interface EventDTO {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  location?: string;
}

export interface DigestDTO {
  id: string;
  weekId: string;
  content: string;
  status: "DRAFT" | "PUBLISHED";
  publishedAt?: string;
}
```

### This Week (Home)
- **Operation:** `getThisWeekSummary`
  - **Input:** `parishId`
  - **Output:** `{ week: WeekSummary; tasks: TaskDTO[]; events: EventDTO[]; digestStatus: DigestDTO | null }`
  - **Auth:** member of parish
  - **Errors:** `NOT_FOUND` (parish), `UNAUTHORIZED`

### Groups
- **Operation:** `listGroups`
  - **Input:** `parishId`
  - **Output:** `GroupDTO[]`
  - **Auth:** member of parish
- **Operation:** `getGroupDetail`
  - **Input:** `parishId`, `groupId`
  - **Output:** `{ group: GroupDTO; members: User[]; tasks: TaskDTO[] }`
  - **Auth:** member of parish
- **Operation:** `updateGroupMembership`
  - **Input:** `groupId`, `userId`, `role`
  - **Output:** `{ success: true }`
  - **Auth:** `ADMIN` or `SHEPHERD`, or group `LEAD` if allowed by parish policy
  - **Errors:** `FORBIDDEN`, `NOT_FOUND`

### Tasks
- **Operation:** `createTask`
  - **Input:** `{ parishId, weekId, ownerId, title, notes?, groupId? }`
  - **Output:** `TaskDTO`
  - **Auth:** `ADMIN`, `SHEPHERD`, or group `LEAD` for group tasks
  - **Errors:** `FORBIDDEN`, `VALIDATION_ERROR`
- **Operation:** `markTaskDone`
  - **Input:** `{ taskId }`
  - **Output:** `TaskDTO`
  - **Auth:** task owner or `ADMIN/SHEPHERD`
  - **Errors:** `FORBIDDEN`, `NOT_FOUND`
- **Operation:** `deferTask`
  - **Input:** `{ taskId, targetWeekId }`
  - **Output:** `TaskDTO`
  - **Auth:** task owner or `ADMIN/SHEPHERD`
  - **Errors:** `FORBIDDEN`, `NOT_FOUND`
- **Operation:** `rolloverWeekTasks`
  - **Input:** `{ parishId, weekId }`
  - **Output:** `{ rolledCount: number }`
  - **Auth:** `ADMIN` or `SHEPHERD`
  - **Errors:** `FORBIDDEN`, `CONFLICT` (if already rolled)

### Calendar (Context Only)
- **Operation:** `listWeekEvents`
  - **Input:** `{ parishId, weekId }`
  - **Output:** `EventDTO[]`
  - **Auth:** member of parish

### Weekly Digest
- **Operation:** `generateDigestPreview`
  - **Input:** `{ parishId, weekId }`
  - **Output:** `{ content: string }`
  - **Auth:** `ADMIN` or `SHEPHERD`
- **Operation:** `saveDigestDraft`
  - **Input:** `{ parishId, weekId, content }`
  - **Output:** `DigestDTO`
  - **Auth:** `ADMIN` or `SHEPHERD`
- **Operation:** `publishDigest`
  - **Input:** `{ digestId }`
  - **Output:** `DigestDTO`
  - **Auth:** `ADMIN` or `SHEPHERD`
  - **Errors:** `FORBIDDEN`, `NOT_FOUND`

## F) Screen-by-Screen Implementation Steps

### 1) This Week (Home)
- **UI components:** week header, tasks list, events list, digest status badge.
- **Server actions:** `getThisWeekSummary`.
- **DB queries:** fetch current week, tasks by week, events by week, digest status.
- **Done means:** page loads in <1s with week context and key items; consistent ordering.
- **Performance notes:** avoid N+1 queries; use Prisma include/select.

### 2) Groups (Ministries & Circles)
- **UI components:** group list, group detail, member list, group tasks list.
- **Server actions:** `listGroups`, `getGroupDetail`, `updateGroupMembership`.
- **DB queries:** groups by parish, membership joins, tasks by group and week.
- **Done means:** group membership visible; group leads can add/remove members (within role).
- **Performance notes:** pagination if group list grows; limit tasks to current week.

### 3) Tasks (Responsibility View)
- **UI components:** personal tasks list, task detail, create task modal.
- **Server actions:** `createTask`, `markTaskDone`, `deferTask`.
- **DB queries:** tasks by owner + week, optional group tasks.
- **Done means:** a user sees their tasks for the week; can mark complete or defer.
- **Performance notes:** keep list indexed by `ownerId + weekId`.

### 4) Calendar (Context Only)
- **UI components:** weekly list view, simple event cards.
- **Server actions:** `listWeekEvents`.
- **DB queries:** events by week.
- **Done means:** shows only events tied to current week; no full calendar UI.
- **Performance notes:** limit to week range only.

### 5) Weekly Digest (Quiet Communication)
- **UI components:** digest editor, preview, status view.
- **Server actions:** `generateDigestPreview`, `saveDigestDraft`, `publishDigest`.
- **DB queries:** digest by week, tasks/events summary for preview.
- **Done means:** digest can be drafted, edited, and published; visible on This Week.
- **Performance notes:** generation is deterministic and fast; no async AI.

## G) Milestones (8–12 weeks)

### Milestone 1 (Weeks 1–2): Project setup + auth + DB + week model
- **Deliverables:** Next.js app skeleton, Prisma setup, NextAuth.js, Parish/Week models.
- **Risks:** auth setup complexity, timezone handling.
- **Demo story:** sign in, create parish, view current week shell.

### Milestone 2 (Weeks 3–4): Tasks + rollover (core moat)
- **Deliverables:** tasks CRUD, mark done, rollover on new week.
- **Risks:** rollover idempotency, permissions.
- **Demo story:** create tasks, advance week, see roll-forward behavior.

### Milestone 3 (Weeks 5–7): Groups + membership + tasks within groups
- **Deliverables:** groups list/detail, membership management, group tasks.
- **Risks:** role boundaries between parish and group roles.
- **Demo story:** create group, add members, assign group tasks.

### Milestone 4 (Weeks 8–9): Calendar context + events
- **Deliverables:** weekly events list, event creation.
- **Risks:** scope creep into scheduling.
- **Demo story:** add events to week, view them in calendar screen.

### Milestone 5 (Weeks 10–12): Digest + polish
- **Deliverables:** digest preview, draft, publish; UI polish and performance.
- **Risks:** digest content drift if schema changes.
- **Demo story:** generate weekly digest from tasks/events and publish.

## H) Non-Goals / Guardrails (V1)
- No dashboards, analytics, or metrics views.
- No sacramental registers.
- No accounting or donations.
- No real-time chat or notification pressure.
- No AI features in V1.
- No feature expansion beyond the five core screens.
- No autonomous task assignment or automatic messaging.
