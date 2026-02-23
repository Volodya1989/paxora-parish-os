import { before, after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/server/db/prisma";
import {
  assignTaskToSelf,
  assignTaskToUser,
  createTask,
  deleteTask,
  toggleTaskOpenToVolunteers,
  markTaskDone,
  markTaskInProgress,
  markTaskOpen,
  unassignTask,
  deferTask,
  rolloverOpenTasks,
  autoArchiveCompletedTasksForParish
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
    openToVolunteers: true,
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

dbTest("claim and unclaim respect open volunteer gating", async () => {
  const parish = await prisma.parish.create({
    data: { name: "St. Jude", slug: "st-jude" }
  });
  const creator = await prisma.user.create({
    data: {
      email: "creator2@example.com",
      name: "Creator",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });
  const member = await prisma.user.create({
    data: {
      email: "member3@example.com",
      name: "Member",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });
  const admin = await prisma.user.create({
    data: {
      email: "admin2@example.com",
      name: "Admin",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });

  await prisma.membership.createMany({
    data: [
      { parishId: parish.id, userId: creator.id, role: "MEMBER" },
      { parishId: parish.id, userId: member.id, role: "MEMBER" },
      { parishId: parish.id, userId: admin.id, role: "ADMIN" }
    ]
  });

  const week = await getOrCreateCurrentWeek(parish.id);
  const task = await createTask({
    parishId: parish.id,
    weekId: week.id,
    createdById: creator.id,
      title: "Set up chairs",
    visibility: "PUBLIC",
    approvalStatus: "APPROVED"
  });

  await assert.rejects(() =>
    assignTaskToSelf({
      taskId: task.id,
      parishId: parish.id,
      actorUserId: member.id
    })
  );

  await toggleTaskOpenToVolunteers({
    taskId: task.id,
    parishId: parish.id,
    actorUserId: admin.id,
    openToVolunteers: true
  });

  await assignTaskToSelf({
    taskId: task.id,
    parishId: parish.id,
    actorUserId: member.id
  });

  const claimed = await prisma.task.findUnique({ where: { id: task.id } });
  assert.equal(claimed?.ownerId, member.id);

  await unassignTask({
    taskId: task.id,
    parishId: parish.id,
    actorUserId: member.id
  });

  const unclaimed = await prisma.task.findUnique({ where: { id: task.id } });
  assert.equal(unclaimed?.ownerId, null);
});

dbTest("private tasks only allow status changes by creator or leaders", async () => {
  const parish = await prisma.parish.create({
    data: { name: "St. Mark", slug: "st-mark" }
  });
  const creator = await prisma.user.create({
    data: {
      email: "creator3@example.com",
      name: "Creator",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });
  const member = await prisma.user.create({
    data: {
      email: "member4@example.com",
      name: "Member",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });
  const leader = await prisma.user.create({
    data: {
      email: "leader@example.com",
      name: "Leader",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });

  await prisma.membership.createMany({
    data: [
      { parishId: parish.id, userId: creator.id, role: "MEMBER" },
      { parishId: parish.id, userId: member.id, role: "MEMBER" },
      { parishId: parish.id, userId: leader.id, role: "SHEPHERD" }
    ]
  });

  const week = await getOrCreateCurrentWeek(parish.id);
  const task = await createTask({
    parishId: parish.id,
    weekId: week.id,
    createdById: creator.id,
    title: "Private prep work",
    visibility: "PRIVATE",
    approvalStatus: "APPROVED"
  });

  await assert.rejects(() =>
    markTaskInProgress({
      taskId: task.id,
      parishId: parish.id,
      actorUserId: member.id
    })
  );

  await markTaskInProgress({
    taskId: task.id,
    parishId: parish.id,
    actorUserId: creator.id
  });

  const progressed = await prisma.task.findUnique({ where: { id: task.id } });
  assert.equal(progressed?.status, "IN_PROGRESS");

  await markTaskOpen({
    taskId: task.id,
    parishId: parish.id,
    actorUserId: leader.id
  });

  const reopened = await prisma.task.findUnique({ where: { id: task.id } });
  assert.equal(reopened?.status, "OPEN");
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
        displayId: "SERV-1",
        title: "Pending public",
        visibility: "PUBLIC",
        approvalStatus: "PENDING"
      },
      {
        parishId: parish.id,
        weekId: week.id,
        ownerId: creator.id,
        createdById: creator.id,
        displayId: "SERV-2",
        title: "Approved public",
        visibility: "PUBLIC",
        approvalStatus: "APPROVED"
      },
      {
        parishId: parish.id,
        weekId: week.id,
        ownerId: creator.id,
        createdById: creator.id,
        displayId: "SERV-3",
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


dbTest("private task completion does not create volunteer hour entries", async () => {
  const parish = await prisma.parish.create({
    data: { name: "St. Private", slug: "st-private" }
  });
  const member = await prisma.user.create({
    data: {
      email: "private-member@example.com",
      name: "Private Member",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });

  await prisma.membership.create({ data: { parishId: parish.id, userId: member.id, role: "MEMBER" } });

  const week = await getOrCreateCurrentWeek(parish.id);
  const task = await createTask({
    parishId: parish.id,
    weekId: week.id,
    ownerId: member.id,
    createdById: member.id,
    title: "Private task completion",
    visibility: "PRIVATE",
    approvalStatus: "APPROVED",
    estimatedHours: 4
  });

  await markTaskDone({
    taskId: task.id,
    parishId: parish.id,
    actorUserId: member.id,
    hours: {
      mode: "manual",
      manualHours: 2
    }
  });

  const completed = await prisma.task.findUnique({ where: { id: task.id } });
  assert.equal(completed?.status, "DONE");

  const hourEntries = await prisma.hoursEntry.findMany({ where: { taskId: task.id } });
  assert.equal(hourEntries.length, 0);
});


dbTest("createTask assigns parish-scoped stable display IDs even during concurrent creates", async () => {
  const parish = await prisma.parish.create({ data: { name: "St. Paul", slug: "st-paul" } });
  const creator = await prisma.user.create({
    data: {
      email: "display@example.com",
      name: "Display",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });

  await prisma.membership.create({ data: { parishId: parish.id, userId: creator.id, role: "ADMIN" } });
  const week = await getOrCreateCurrentWeek(parish.id);

  const created = await Promise.all(
    Array.from({ length: 12 }).map((_, idx) =>
      createTask({
        parishId: parish.id,
        weekId: week.id,
        createdById: creator.id,
        title: `Concurrent ${idx + 1}`,
        visibility: "PUBLIC",
        approvalStatus: "APPROVED"
      })
    )
  );

  const displayIds = created.map((task) => task.displayId);
  assert.equal(new Set(displayIds).size, displayIds.length);
  assert.ok(displayIds.every((value) => value.startsWith("SERV-")));
});

dbTest("weekly auto-archive is idempotent", async () => {
  const parish = await prisma.parish.create({
    data: { name: "St. Archive", slug: "st-archive", timezone: "America/New_York" }
  });
  const owner = await prisma.user.create({
    data: {
      email: "archive-owner@example.com",
      name: "Archive Owner",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });

  await prisma.membership.create({ data: { parishId: parish.id, userId: owner.id, role: "ADMIN" } });
  const week = await getOrCreateCurrentWeek(parish.id, new Date("2024-06-10T12:00:00.000Z"));

  const doneTask = await createTask({
    parishId: parish.id,
    weekId: week.id,
    createdById: owner.id,
    ownerId: owner.id,
    title: "Done task",
    visibility: "PUBLIC",
    approvalStatus: "APPROVED"
  });

  await prisma.task.update({
    where: { id: doneTask.id },
    data: { status: "DONE", completedAt: new Date("2024-06-01T15:00:00.000Z") }
  });

  const firstRun = await autoArchiveCompletedTasksForParish({
    parishId: parish.id,
    timezone: parish.timezone,
    now: new Date("2024-06-16T05:00:00.000Z")
  });
  const secondRun = await autoArchiveCompletedTasksForParish({
    parishId: parish.id,
    timezone: parish.timezone,
    now: new Date("2024-06-16T05:05:00.000Z")
  });

  assert.equal(firstRun.archived, 1);
  assert.equal(secondRun.archived, 0);

  const archivedTask = await prisma.task.findUnique({ where: { id: doneTask.id } });
  assert.equal(archivedTask?.status, "ARCHIVED");
  assert.ok(archivedTask?.archivedAt);
});

dbTest("search by display ID finds archived tasks", async () => {
  const parish = await prisma.parish.create({ data: { name: "St. Find", slug: "st-find" } });
  const user = await prisma.user.create({
    data: {
      email: "finder@example.com",
      name: "Finder",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });

  await prisma.membership.create({ data: { parishId: parish.id, userId: user.id, role: "ADMIN" } });
  const week = await getOrCreateCurrentWeek(parish.id);

  const task = await createTask({
    parishId: parish.id,
    weekId: week.id,
    createdById: user.id,
    title: "Kitchen cleanup",
    visibility: "PUBLIC",
    approvalStatus: "APPROVED"
  });

  await prisma.task.update({
    where: { id: task.id },
    data: {
      status: "ARCHIVED",
      completedAt: new Date("2024-06-01T15:00:00.000Z"),
      archivedAt: new Date("2024-06-16T05:00:00.000Z")
    }
  });

  const listed = await listTasks({
    parishId: parish.id,
    actorUserId: user.id,
    weekId: week.id,
    filters: {
      status: "archived",
      ownership: "all",
      query: task.displayId
    }
  });

  assert.equal(listed.tasks.length, 1);
  assert.equal(listed.tasks[0]?.id, task.id);
});
