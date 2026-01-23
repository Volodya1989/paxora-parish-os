import { before, after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/server/db/prisma";
import {
  assignTaskToSelf,
  assignTaskToUser,
  createTask,
  deleteTask,
  markTaskDone,
  markTaskInProgress,
  markTaskOpen,
  deferTask,
  rolloverOpenTasks
} from "@/domain/tasks";
import { getOrCreateCurrentWeek } from "@/domain/week";
import { listPendingTaskApprovals, listTasks } from "@/lib/queries/tasks";
import { applyMigrations } from "./_helpers/migrate";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const dbTest = hasDatabase ? test : test.skip;

async function resetDatabase() {
  await prisma.digest.deleteMany();
  await prisma.event.deleteMany();
  await prisma.task.deleteMany();
  await prisma.groupMembership.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.group.deleteMany();
  await prisma.week.deleteMany();
  await prisma.parish.deleteMany();
  await prisma.user.deleteMany();
}

before(async () => {
  if (!hasDatabase) {
    return;
  }
  await applyMigrations();
  await prisma.$connect();
  await resetDatabase();
});

beforeEach(async () => {
  if (!hasDatabase) {
    return;
  }
  await resetDatabase();
});

after(async () => {
  if (!hasDatabase) {
    return;
  }
  await resetDatabase();
  await prisma.$disconnect();
});

dbTest("tasks can be created, completed, deferred, and rolled over once", async () => {
  const parish = await prisma.parish.create({
    data: { name: "St. Mark", slug: "st-mark" }
  });
  const owner = await prisma.user.create({
    data: {
      email: "owner@example.com",
      name: "Owner",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });
  await prisma.membership.create({
    data: {
      parishId: parish.id,
      userId: owner.id,
      role: "ADMIN"
    }
  });

  const weekOneStart = new Date("2024-01-01T00:00:00.000Z");
  const weekOneEnd = new Date("2024-01-08T00:00:00.000Z");
  const weekTwoStart = new Date("2024-01-08T00:00:00.000Z");
  const weekTwoEnd = new Date("2024-01-15T00:00:00.000Z");

  const weekOne = await prisma.week.create({
    data: {
      parishId: parish.id,
      startsOn: weekOneStart,
      endsOn: weekOneEnd,
      label: "2024-W01"
    }
  });
  const weekTwo = await prisma.week.create({
    data: {
      parishId: parish.id,
      startsOn: weekTwoStart,
      endsOn: weekTwoEnd,
      label: "2024-W02"
    }
  });

  const openTask = await createTask({
    parishId: parish.id,
    weekId: weekOne.id,
    ownerId: owner.id,
    createdById: owner.id,
    title: "Open task",
    visibility: "PUBLIC",
    approvalStatus: "APPROVED"
  });

  const doneTask = await createTask({
    parishId: parish.id,
    weekId: weekOne.id,
    ownerId: owner.id,
    createdById: owner.id,
    title: "Done task",
    visibility: "PUBLIC",
    approvalStatus: "APPROVED"
  });

  const completed = await markTaskDone({
    taskId: doneTask.id,
    parishId: parish.id,
    actorUserId: owner.id
  });

  assert.equal(completed.status, "DONE");
  assert.ok(completed.completedAt);

  await deferTask({
    taskId: openTask.id,
    parishId: parish.id,
    actorUserId: owner.id,
    targetWeekId: weekTwo.id
  });

  const deferred = await prisma.task.findUnique({ where: { id: openTask.id } });
  assert.equal(deferred?.weekId, weekTwo.id);

  const rolloverCount = await rolloverOpenTasks({
    parishId: parish.id,
    fromWeekId: weekOne.id,
    toWeekId: weekTwo.id
  });

  assert.equal(rolloverCount, 0);

  const anotherOpen = await createTask({
    parishId: parish.id,
    weekId: weekOne.id,
    ownerId: owner.id,
    createdById: owner.id,
    title: "Needs rollover",
    visibility: "PUBLIC",
    approvalStatus: "APPROVED"
  });

  const firstRollover = await rolloverOpenTasks({
    parishId: parish.id,
    fromWeekId: weekOne.id,
    toWeekId: weekTwo.id
  });

  assert.equal(firstRollover, 1);

  const rolledTask = await prisma.task.findFirst({
    where: {
      weekId: weekTwo.id,
      rolledFromTaskId: anotherOpen.id
    }
  });

  assert.ok(rolledTask);

  const secondRollover = await rolloverOpenTasks({
    parishId: parish.id,
    fromWeekId: weekOne.id,
    toWeekId: weekTwo.id
  });

  assert.equal(secondRollover, 0);
});

dbTest("createTask assigns task to the current week", async () => {
  const parish = await prisma.parish.create({
    data: { name: "St. Luke", slug: "st-luke" }
  });
  const owner = await prisma.user.create({
    data: {
      email: "current@example.com",
      name: "Current Owner",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });

  const currentWeek = await getOrCreateCurrentWeek(parish.id);
  const task = await createTask({
    parishId: parish.id,
    weekId: currentWeek.id,
    ownerId: owner.id,
    createdById: owner.id,
    title: "Current week task",
    visibility: "PUBLIC",
    approvalStatus: "APPROVED"
  });

  const storedTask = await prisma.task.findUnique({ where: { id: task.id } });
  assert.equal(storedTask?.weekId, currentWeek.id);
});

dbTest("members can self-assign public tasks, and only leaders or creators can delete", async () => {
  const parish = await prisma.parish.create({
    data: { name: "St. Clare", slug: "st-clare" }
  });
  const creator = await prisma.user.create({
    data: {
      email: "creator@example.com",
      name: "Creator",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });
  const member = await prisma.user.create({
    data: {
      email: "member@example.com",
      name: "Member",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });
  const admin = await prisma.user.create({
    data: {
      email: "admin@example.com",
      name: "Admin",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });

  await prisma.membership.create({
    data: {
      parishId: parish.id,
      userId: creator.id,
      role: "MEMBER"
    }
  });
  await prisma.membership.create({
    data: {
      parishId: parish.id,
      userId: member.id,
      role: "MEMBER"
    }
  });
  await prisma.membership.create({
    data: {
      parishId: parish.id,
      userId: admin.id,
      role: "ADMIN"
    }
  });

  const week = await getOrCreateCurrentWeek(parish.id, new Date("2024-06-10T00:00:00.000Z"));
  const task = await createTask({
    parishId: parish.id,
    weekId: week.id,
    createdById: creator.id,
    title: "Welcome new members",
    visibility: "PUBLIC",
    approvalStatus: "APPROVED"
  });

  await assignTaskToSelf({
    taskId: task.id,
    parishId: parish.id,
    actorUserId: member.id
  });

  const assigned = await prisma.task.findUnique({ where: { id: task.id } });
  assert.equal(assigned?.ownerId, member.id);

  await assert.rejects(() =>
    deleteTask({
      taskId: task.id,
      parishId: parish.id,
      actorUserId: member.id
    })
  );

  await deleteTask({
    taskId: task.id,
    parishId: parish.id,
    actorUserId: admin.id
  });

  const deleted = await prisma.task.findUnique({ where: { id: task.id } });
  assert.equal(deleted, null);
});

dbTest("createTask assigns group tasks to the current week and group detail filters them", async () => {
  const parish = await prisma.parish.create({
    data: { name: "St. John", slug: "st-john" }
  });
  const owner = await prisma.user.create({
    data: {
      email: "group-owner@example.com",
      name: "Group Owner",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });
  const group = await prisma.group.create({
    data: {
      parishId: parish.id,
      name: "Hospitality Team",
      description: "Greeters and hosts",
      createdById: owner.id,
    }
  });

  const currentWeek = await getOrCreateCurrentWeek(parish.id);
  const groupTask = await createTask({
    parishId: parish.id,
    weekId: currentWeek.id,
    ownerId: owner.id,
    groupId: group.id,
    createdById: owner.id,
    title: "Prepare welcome packets",
    visibility: "PUBLIC",
    approvalStatus: "APPROVED"
  });
  await createTask({
    parishId: parish.id,
    weekId: currentWeek.id,
    ownerId: owner.id,
    createdById: owner.id,
    title: "General task",
    visibility: "PUBLIC",
    approvalStatus: "APPROVED"
  });

  const storedTask = await prisma.task.findUnique({ where: { id: groupTask.id } });
  assert.equal(storedTask?.weekId, currentWeek.id);
  assert.equal(storedTask?.groupId, group.id);

  const groupDetailTasks = await prisma.task.findMany({ where: { groupId: group.id } });
  assert.equal(groupDetailTasks.length, 1);
  assert.equal(groupDetailTasks[0]?.id, groupTask.id);
});

dbTest("task visibility and approval are enforced in list queries", async () => {
  const parish = await prisma.parish.create({
    data: { name: "St. Theresa", slug: "st-theresa" }
  });
  const creator = await prisma.user.create({
    data: {
      email: "creator@example.com",
      name: "Creator",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });
  const member = await prisma.user.create({
    data: {
      email: "member@example.com",
      name: "Member",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });
  const shepherd = await prisma.user.create({
    data: {
      email: "shepherd@example.com",
      name: "Shepherd",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });

  await prisma.membership.createMany({
    data: [
      { parishId: parish.id, userId: creator.id, role: "MEMBER" },
      { parishId: parish.id, userId: member.id, role: "MEMBER" },
      { parishId: parish.id, userId: shepherd.id, role: "SHEPHERD" }
    ]
  });

  const week = await getOrCreateCurrentWeek(parish.id);

  await prisma.task.createMany({
    data: [
      {
        parishId: parish.id,
        weekId: week.id,
        ownerId: creator.id,
        createdById: creator.id,
        title: "Pending public",
        visibility: "PUBLIC",
        approvalStatus: "PENDING"
      },
      {
        parishId: parish.id,
        weekId: week.id,
        ownerId: creator.id,
        createdById: creator.id,
        title: "Approved public",
        visibility: "PUBLIC",
        approvalStatus: "APPROVED"
      },
      {
        parishId: parish.id,
        weekId: week.id,
        ownerId: creator.id,
        createdById: creator.id,
        title: "Private task",
        visibility: "PRIVATE",
        approvalStatus: "APPROVED"
      }
    ]
  });

  const creatorList = await listTasks({
    parishId: parish.id,
    actorUserId: creator.id,
    weekId: week.id
  });
  assert.equal(creatorList.tasks.length, 3);

  const memberList = await listTasks({
    parishId: parish.id,
    actorUserId: member.id,
    weekId: week.id
  });
  assert.deepEqual(
    memberList.tasks.map((task) => task.title),
    ["Approved public"]
  );

  const approvals = await listPendingTaskApprovals({
    parishId: parish.id,
    actorUserId: shepherd.id,
    weekId: week.id
  });
  assert.equal(approvals.length, 1);
  assert.equal(approvals[0]?.title, "Pending public");
});

dbTest("tasks default due dates and allow assignment and status changes", async () => {
  const parish = await prisma.parish.create({
    data: { name: "St. Agnes", slug: "st-agnes" }
  });
  const admin = await prisma.user.create({
    data: {
      email: "admin@example.com",
      name: "Admin",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });
  const member = await prisma.user.create({
    data: {
      email: "member2@example.com",
      name: "Member",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });

  await prisma.membership.createMany({
    data: [
      { parishId: parish.id, userId: admin.id, role: "ADMIN" },
      { parishId: parish.id, userId: member.id, role: "MEMBER" }
    ]
  });

  const week = await getOrCreateCurrentWeek(parish.id);
  const task = await createTask({
    parishId: parish.id,
    weekId: week.id,
    createdById: admin.id,
    title: "Serve with due date",
    visibility: "PUBLIC",
    approvalStatus: "APPROVED"
  });

  const storedTask = await prisma.task.findUnique({ where: { id: task.id } });
  assert.ok(storedTask?.dueAt);
  assert.ok(storedTask?.createdAt);
  if (storedTask?.dueAt && storedTask.createdAt) {
    const diffDays =
      (storedTask.dueAt.getTime() - storedTask.createdAt.getTime()) /
      (1000 * 60 * 60 * 24);
    assert.ok(diffDays > 13.5 && diffDays < 14.5);
  }

  await assignTaskToUser({
    taskId: task.id,
    parishId: parish.id,
    actorUserId: admin.id,
    ownerId: member.id
  });

  const assigned = await prisma.task.findUnique({ where: { id: task.id } });
  assert.equal(assigned?.ownerId, member.id);

  await markTaskInProgress({
    taskId: task.id,
    parishId: parish.id,
    actorUserId: member.id
  });

  const inProgress = await prisma.task.findUnique({ where: { id: task.id } });
  assert.equal(inProgress?.status, "IN_PROGRESS");

  await markTaskDone({
    taskId: task.id,
    parishId: parish.id,
    actorUserId: member.id
  });

  const done = await prisma.task.findUnique({ where: { id: task.id } });
  assert.equal(done?.status, "DONE");

  await markTaskOpen({
    taskId: task.id,
    parishId: parish.id,
    actorUserId: member.id
  });

  const reopened = await prisma.task.findUnique({ where: { id: task.id } });
  assert.equal(reopened?.status, "OPEN");

  const openTask = await createTask({
    parishId: parish.id,
    weekId: week.id,
    createdById: admin.id,
    title: "Self-assignable task",
    visibility: "PUBLIC",
    approvalStatus: "APPROVED"
  });

  await assignTaskToSelf({
    taskId: openTask.id,
    parishId: parish.id,
    actorUserId: admin.id
  });

  const selfAssigned = await prisma.task.findUnique({ where: { id: openTask.id } });
  assert.equal(selfAssigned?.ownerId, admin.id);
});
