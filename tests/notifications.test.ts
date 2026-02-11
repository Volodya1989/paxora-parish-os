import { before, after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/server/db/prisma";
import { createTask } from "@/domain/tasks";
import { getNotificationItems } from "@/lib/queries/notifications";
import { notifyRequestAssignedInApp, notifyTaskCreatedInApp } from "@/lib/notifications/notify";
import { applyMigrations } from "./_helpers/migrate";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const dbTest = hasDatabase ? test : test.skip;

async function resetDatabase() {
  await prisma.notification.deleteMany();
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

dbTest("task assignment creates stored notifications and read state updates", async () => {
  const parish = await prisma.parish.create({
    data: { name: "St. Agnes", slug: "st-agnes" }
  });
  const creator = await prisma.user.create({
    data: {
      email: "creator@example.com",
      name: "Creator",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });
  const owner = await prisma.user.create({
    data: {
      email: "owner@example.com",
      name: "Owner",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });

  await prisma.membership.createMany({
    data: [
      { parishId: parish.id, userId: creator.id, role: "ADMIN" },
      { parishId: parish.id, userId: owner.id, role: "MEMBER" }
    ]
  });

  const week = await prisma.week.create({
    data: {
      parishId: parish.id,
      startsOn: new Date("2024-01-01T00:00:00.000Z"),
      endsOn: new Date("2024-01-08T00:00:00.000Z"),
      label: "2024-W01"
    }
  });

  await createTask({
    parishId: parish.id,
    weekId: week.id,
    ownerId: owner.id,
    createdById: creator.id,
    title: "Prepare bulletin",
    visibility: "PUBLIC",
    approvalStatus: "APPROVED"
  });

  const notifications = await prisma.notification.findMany({
    where: { userId: owner.id }
  });

  assert.equal(notifications.length, 1);
  assert.equal(notifications[0]?.title, "New task assigned to you");

  const unread = await getNotificationItems(owner.id, parish.id);
  assert.equal(unread.count, 1);
  assert.equal(unread.items.length, 1);
  assert.equal(unread.items[0]?.readAt, null);

  await prisma.notification.update({
    where: { id: notifications[0]!.id },
    data: { readAt: new Date() }
  });

  const afterRead = await getNotificationItems(owner.id, parish.id);
  assert.equal(afterRead.count, 0);
  assert.equal(afterRead.items.length, 1);
  assert.ok(afterRead.items[0]?.readAt);
});


dbTest("in-app category preferences suppress newly created notifications", async () => {
  const parish = await prisma.parish.create({
    data: { name: "St. Nicholas", slug: "st-nicholas" }
  });

  const creator = await prisma.user.create({
    data: {
      email: "creator-pref@example.com",
      name: "Creator",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });

  const owner = await prisma.user.create({
    data: {
      email: "owner-pref@example.com",
      name: "Owner",
      passwordHash: "hashed",
      activeParishId: parish.id,
      notifyTaskInApp: false
    }
  });

  await prisma.membership.createMany({
    data: [
      { parishId: parish.id, userId: creator.id, role: "ADMIN" },
      { parishId: parish.id, userId: owner.id, role: "MEMBER" }
    ]
  });

  await notifyTaskCreatedInApp({
    taskId: "task-123",
    taskTitle: "Prepare flowers",
    parishId: parish.id,
    createdById: creator.id,
    creatorName: "Creator",
    ownerId: owner.id
  });

  const notifications = await prisma.notification.findMany({
    where: { userId: owner.id, parishId: parish.id }
  });

  assert.equal(notifications.length, 0);
});

dbTest("request assignment notifications route assignees to admin request board", async () => {
  const parish = await prisma.parish.create({
    data: { name: "St. Michael", slug: "st-michael" }
  });

  const assignee = await prisma.user.create({
    data: {
      email: "assignee@example.com",
      name: "Assignee",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });

  await prisma.membership.create({
    data: { parishId: parish.id, userId: assignee.id, role: "ADMIN" }
  });

  await notifyRequestAssignedInApp({
    requestId: "req_123",
    requestTitle: "Pastoral visit",
    parishId: parish.id,
    assigneeId: assignee.id
  });

  const notification = await prisma.notification.findFirst({
    where: { userId: assignee.id, parishId: parish.id, type: "REQUEST" }
  });

  assert.ok(notification);
  assert.equal(notification?.href, "/admin/requests?requestId=req_123");
});
