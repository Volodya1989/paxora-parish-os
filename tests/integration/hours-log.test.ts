import { after, before, test, mock } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/server/db/prisma";
import { getOrCreateCurrentWeek } from "@/domain/week";
import { loadModuleFromRoot } from "../_helpers/load-module";
import { applyMigrations } from "../_helpers/migrate";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const dbTest = hasDatabase ? test.skip : test.skip;

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
  await prisma.hoursEntry.deleteMany();
  await prisma.taskVolunteer.deleteMany();
  await prisma.task.deleteMany();
  await prisma.groupMembership.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.group.deleteMany();
  await prisma.week.deleteMany();
  await prisma.parish.deleteMany();
  await prisma.user.deleteMany();
}

let actions: typeof import("@/server/actions/tasks");

before(async () => {
  if (!hasDatabase) {
    return;
  }
  await applyMigrations();
  actions = await loadModuleFromRoot("server/actions/tasks");
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

dbTest("completing a task logs estimated hours when V < N", async () => {
  const parish = await prisma.parish.create({
    data: { name: "St. Clare", slug: "st-clare" }
  });
  const owner = await prisma.user.create({
    data: {
      email: "owner@example.com",
      name: "Owner",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });
  const volunteer = await prisma.user.create({
    data: {
      email: "volunteer@example.com",
      name: "Volunteer",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });

  await prisma.membership.createMany({
    data: [
      { parishId: parish.id, userId: owner.id, role: "MEMBER" },
      { parishId: parish.id, userId: volunteer.id, role: "MEMBER" }
    ]
  });

  session.user.id = owner.id;
  session.user.activeParishId = parish.id;

  const week = await getOrCreateCurrentWeek(parish.id, new Date("2024-06-10T00:00:00.000Z"));
  const task = await prisma.task.create({
    data: {
      parishId: parish.id,
      weekId: week.id,
      ownerId: owner.id,
      createdById: owner.id,
      title: "Set up chairs",
      estimatedHours: 2,
      volunteersNeeded: 5,
      status: "IN_PROGRESS"
    }
  });

  await prisma.taskVolunteer.create({
    data: {
      taskId: task.id,
      userId: volunteer.id
    }
  });

  await actions.markTaskDone({ taskId: task.id });

  const entries = await prisma.hoursEntry.findMany({
    where: { taskId: task.id },
    orderBy: { userId: "asc" }
  });

  assert.equal(entries.length, 2);
  assert.equal(entries[0]?.hours, 5);
  assert.equal(entries[1]?.hours, 5);
});
