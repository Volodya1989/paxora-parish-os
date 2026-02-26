import { after, before, beforeEach, mock, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/server/db/prisma";
import { applyMigrations } from "../_helpers/migrate";
import { loadModuleFromRoot } from "../_helpers/load-module";
import { AUDIT_ACTIONS } from "@/lib/audit/actions";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const dbTest = hasDatabase ? test : test.skip;
let setupFailureReason: string | null = null;

async function clearEventRecurrenceExceptionsIfAvailable() {
  const recurrenceDelegate = (prisma as typeof prisma & {
    eventRecurrenceException?: { deleteMany: () => Promise<unknown> };
  }).eventRecurrenceException;

  if (!recurrenceDelegate) {
    return;
  }

  try {
    await recurrenceDelegate.deleteMany();
  } catch (error) {
    const code =
      typeof error === "object" && error && "code" in error
        ? (error as { code?: string }).code
        : undefined;
    if (code !== "P2021") {
      throw error;
    }
  }
}

const session = {
  user: {
    id: "",
    activeParishId: ""
  }
};

mock.module("next-auth", {
  namedExports: {
    getServerSession: async () => session
  }
});

mock.module("next/cache", {
  namedExports: {
    revalidatePath: () => undefined
  }
});

async function resetDatabase() {
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await clearEventRecurrenceExceptionsIfAvailable();
  await prisma.event.deleteMany();
  await prisma.task.deleteMany();
  await prisma.groupMembership.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.group.deleteMany();
  await prisma.week.deleteMany();
  await prisma.parish.deleteMany();
  await prisma.user.deleteMany();
}

let groupActions: any;
let eventActions: any;
let taskActions: any;
let memberActions: any;

before(async () => {
  if (!hasDatabase) {
    return;
  }

  try {
    await applyMigrations();
    groupActions = await loadModuleFromRoot("server/actions/groups");
    eventActions = await loadModuleFromRoot("server/actions/events");
    taskActions = await loadModuleFromRoot("server/actions/tasks");
    memberActions = await loadModuleFromRoot("app/actions/members");
    await prisma.$connect();
    await resetDatabase();
    setupFailureReason = null;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    setupFailureReason = `integration setup failed: ${errorMessage}`;
  }
});

beforeEach(async () => {
  if (!hasDatabase) {
    return;
  }

  if (setupFailureReason) {
    return;
  }

  try {
    await resetDatabase();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    setupFailureReason = `integration beforeEach failed: ${errorMessage}`;
  }
});

after(async () => {
  if (!hasDatabase) {
    return;
  }

  if (!setupFailureReason) {
    await resetDatabase();
  }

  try {
    await prisma.$disconnect();
  } catch {
    // Best-effort disconnect for flaky CI database teardown.
  }
});

dbTest("writes audit logs for critical destructive/approval mutations", async (t) => {
  if (setupFailureReason) {
    t.skip(setupFailureReason);
    return;
  }

  const parish = await prisma.parish.create({
    data: { name: "St. Audit", slug: "st-audit" }
  });

  const [admin, member] = await Promise.all([
    prisma.user.create({
      data: {
        email: "admin-audit@example.com",
        name: "Admin",
        passwordHash: "hashed",
        activeParishId: parish.id
      }
    }),
    prisma.user.create({
      data: {
        email: "member-audit@example.com",
        name: "Member",
        passwordHash: "hashed",
        activeParishId: parish.id
      }
    })
  ]);

  await prisma.membership.createMany({
    data: [
      { parishId: parish.id, userId: admin.id, role: "ADMIN" },
      { parishId: parish.id, userId: member.id, role: "MEMBER" }
    ]
  });

  const group = await prisma.group.create({
    data: {
      parishId: parish.id,
      createdById: admin.id,
      name: "Audit Group",
      status: "ACTIVE",
      archivedAt: new Date()
    }
  });

  await prisma.groupMembership.create({
    data: {
      groupId: group.id,
      userId: member.id,
      role: "PARISHIONER",
      status: "ACTIVE"
    }
  });

  const event = await prisma.event.create({
    data: {
      parishId: parish.id,
      weekId: (await prisma.week.create({
        data: {
          parishId: parish.id,
          startsOn: new Date("2026-02-16T00:00:00.000Z"),
          endsOn: new Date("2026-02-22T23:59:59.000Z"),
          label: "Week"
        }
      })).id,
      title: "Audit Event",
      startsAt: new Date("2026-02-18T10:00:00.000Z"),
      endsAt: new Date("2026-02-18T11:00:00.000Z")
    }
  });

  const pendingTaskOne = await prisma.task.create({
    data: {
      parishId: parish.id,
      weekId: event.weekId,
      createdById: member.id,
      displayId: "A-1",
      title: "Approve me",
      visibility: "PUBLIC",
      approvalStatus: "PENDING"
    }
  });

  const pendingTaskTwo = await prisma.task.create({
    data: {
      parishId: parish.id,
      weekId: event.weekId,
      createdById: member.id,
      displayId: "A-2",
      title: "Reject me",
      visibility: "PUBLIC",
      approvalStatus: "PENDING"
    }
  });

  session.user.id = admin.id;
  session.user.activeParishId = parish.id;

  const roleResult = await memberActions.changeMemberRole({
    groupId: group.id,
    userId: member.id,
    role: "COORDINATOR"
  });
  assert.equal(roleResult.status, "success");

  const removeResult = await memberActions.removeMember({
    groupId: group.id,
    userId: member.id
  });
  assert.equal(removeResult.status, "success");

  await groupActions.deleteGroup({
    parishId: parish.id,
    actorUserId: admin.id,
    groupId: group.id
  });

  const deleteEventFormData = new FormData();
  deleteEventFormData.set("eventId", event.id);
  const deleteEventResult = await eventActions.deleteEvent({ status: "idle" }, deleteEventFormData);
  assert.equal(deleteEventResult.status, "success");

  await taskActions.approveTask({ taskId: pendingTaskOne.id });
  await taskActions.rejectTask({ taskId: pendingTaskTwo.id });

  const logs = await prisma.auditLog.findMany({
    where: { parishId: parish.id, actorUserId: admin.id },
    orderBy: { createdAt: "asc" }
  });

  const actions = logs.map((log) => log.action);
  assert.equal(actions.filter((value) => value === AUDIT_ACTIONS.GROUP_MEMBER_ROLE_CHANGED).length, 1);
  assert.equal(actions.filter((value) => value === AUDIT_ACTIONS.GROUP_MEMBER_REMOVED).length, 1);
  assert.equal(actions.filter((value) => value === AUDIT_ACTIONS.GROUP_DELETED).length, 1);
  assert.equal(actions.filter((value) => value === AUDIT_ACTIONS.EVENT_DELETED).length, 1);
  assert.equal(actions.filter((value) => value === AUDIT_ACTIONS.TASK_APPROVED).length, 1);
  assert.equal(actions.filter((value) => value === AUDIT_ACTIONS.TASK_REJECTED).length, 1);

  const roleLog = logs.find((log) => log.action === AUDIT_ACTIONS.GROUP_MEMBER_ROLE_CHANGED);
  assert.deepEqual(roleLog?.metadata, {
    groupId: group.id,
    memberUserId: member.id,
    fromRole: "PARISHIONER",
    toRole: "COORDINATOR"
  });

  const rejectLog = logs.find((log) => log.action === AUDIT_ACTIONS.TASK_REJECTED);
  assert.deepEqual(rejectLog?.metadata, {
    taskId: pendingTaskTwo.id,
    title: "Reject me",
    reason: null
  });
});
