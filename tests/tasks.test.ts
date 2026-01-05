import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/server/db/prisma";
import { createTask, markTaskDone, deferTask, rolloverOpenTasks } from "@/domain/tasks";
import { getOrCreateCurrentWeek } from "@/domain/week";

async function resetDatabase() {
  await prisma.task.deleteMany();
  await prisma.groupMembership.deleteMany();
  await prisma.group.deleteMany();
  await prisma.week.deleteMany();
  await prisma.parish.deleteMany();
  await prisma.user.deleteMany();
}

before(async () => {
  await prisma.$connect();
  await resetDatabase();
});

after(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});

test("tasks can be created, completed, deferred, and rolled over once", async () => {
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
    title: "Open task"
  });

  const doneTask = await createTask({
    parishId: parish.id,
    weekId: weekOne.id,
    ownerId: owner.id,
    title: "Done task"
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
    title: "Needs rollover"
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

test("createTask assigns task to the current week", async () => {
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
    title: "Current week task"
  });

  const storedTask = await prisma.task.findUnique({ where: { id: task.id } });
  assert.equal(storedTask?.weekId, currentWeek.id);
});

test("createTask assigns group tasks to the current week and group detail filters them", async () => {
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
      description: "Greeters and hosts"
    }
  });

  const currentWeek = await getOrCreateCurrentWeek(parish.id);
  const groupTask = await createTask({
    parishId: parish.id,
    weekId: currentWeek.id,
    ownerId: owner.id,
    groupId: group.id,
    title: "Prepare welcome packets"
  });
  await createTask({
    parishId: parish.id,
    weekId: currentWeek.id,
    ownerId: owner.id,
    title: "General task"
  });

  const storedTask = await prisma.task.findUnique({ where: { id: groupTask.id } });
  assert.equal(storedTask?.weekId, currentWeek.id);
  assert.equal(storedTask?.groupId, group.id);

  const groupDetailTasks = await prisma.task.findMany({ where: { groupId: group.id } });
  assert.equal(groupDetailTasks.length, 1);
  assert.equal(groupDetailTasks[0]?.id, groupTask.id);
});
