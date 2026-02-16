import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/server/db/prisma";
import { getProfileSettings } from "@/lib/queries/profile";
import { getOrCreateCurrentWeek } from "@/domain/week";
import { applyMigrations } from "../_helpers/migrate";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const dbTest = hasDatabase ? test : test.skip;

async function resetDatabase() {
  await prisma.hoursEntry.deleteMany();
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

after(async () => {
  if (!hasDatabase) {
    return;
  }
  await resetDatabase();
  await prisma.$disconnect();
});

dbTest("profile shows YTD hours and milestone tier", async () => {
  const parish = await prisma.parish.create({
    data: {
      name: "St. Agnes",
      slug: "st-agnes",
      bronzeHours: 10,
      silverHours: 20,
      goldHours: 30
    }
  });
  const user = await prisma.user.create({
    data: {
      email: "member@example.com",
      name: "Member",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });

  await prisma.membership.create({
    data: { parishId: parish.id, userId: user.id, role: "MEMBER" }
  });

  const now = new Date("2024-08-15T12:00:00.000Z");
  const week = await getOrCreateCurrentWeek(parish.id, now);
  const task = await prisma.task.create({
    data: {
      parishId: parish.id,
      weekId: week.id,
      createdById: user.id,
      ownerId: user.id,
      displayId: "SERV-1",
      title: "Serve coffee"
    }
  });
  const taskTwo = await prisma.task.create({
    data: {
      parishId: parish.id,
      weekId: week.id,
      createdById: user.id,
      ownerId: user.id,
      displayId: "SERV-2",
      title: "Restock supplies"
    }
  });
  const taskLastYear = await prisma.task.create({
    data: {
      parishId: parish.id,
      weekId: week.id,
      createdById: user.id,
      ownerId: user.id,
      displayId: "SERV-3",
      title: "Archive files"
    }
  });

  await prisma.hoursEntry.createMany({
    data: [
      {
        parishId: parish.id,
        weekId: week.id,
        taskId: task.id,
        userId: user.id,
        hours: 5,
        source: "ESTIMATED",
        createdAt: now
      },
      {
        parishId: parish.id,
        weekId: week.id,
        taskId: taskTwo.id,
        userId: user.id,
        hours: 7,
        source: "ESTIMATED",
        createdAt: now
      },
      {
        parishId: parish.id,
        weekId: week.id,
        taskId: taskLastYear.id,
        userId: user.id,
        hours: 100,
        source: "ESTIMATED",
        createdAt: new Date("2023-01-05T00:00:00.000Z")
      }
    ]
  });

  const profile = await getProfileSettings({
    userId: user.id,
    parishId: parish.id,
    getNow: () => now
  });

  assert.equal(profile.ytdHours, 12);
  assert.equal(profile.milestoneTier, "BRONZE");
});
