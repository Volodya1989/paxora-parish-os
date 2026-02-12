import { after, before, test, mock } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/server/db/prisma";
import { getOrCreateCurrentWeek } from "@/domain/week";
import { loadModuleFromRoot } from "../_helpers/load-module";
import { applyMigrations } from "../_helpers/migrate";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const dbTest = hasDatabase ? test : test.skip;

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
  await prisma.announcement.deleteMany();
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

let actions: any;
let taskState: any;

before(async () => {
  if (!hasDatabase) {
    return;
  }
  await applyMigrations();
  actions = await loadModuleFromRoot("server/actions/tasks");
  taskState = await loadModuleFromRoot("server/actions/taskState");
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

test.skip("create task succeeds with valid input", async () => {
  const parish = await prisma.parish.create({
    data: { name: "St. Agnes", slug: "st-agnes" }
  });
  const user = await prisma.user.create({
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
      userId: user.id,
      role: "MEMBER"
    }
  });

  session.user.id = user.id;
  session.user.activeParishId = parish.id;

  const week = await getOrCreateCurrentWeek(parish.id, new Date("2024-02-05T00:00:00.000Z"));
  const formData = new FormData();
  formData.set("weekId", week.id);
  formData.set("title", "Draft Sunday run-of-show");
  formData.set("notes", "Coordinate with the worship lead.");

  const result = await actions.createTask(taskState.initialTaskActionState, formData);
  assert.equal(result.status, "success");

  const stored = await prisma.task.findFirst({
    where: { parishId: parish.id, title: "Draft Sunday run-of-show" }
  });
  assert.ok(stored);
  assert.equal(stored?.ownerId, user.id);
});

test.skip("create task rejects missing title", async () => {
  const parish = await prisma.parish.create({
    data: { name: "St. Jude", slug: "st-jude" }
  });
  const user = await prisma.user.create({
    data: {
      email: "missing-title@example.com",
      name: "Owner",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });
  await prisma.membership.create({
    data: {
      parishId: parish.id,
      userId: user.id,
      role: "MEMBER"
    }
  });

  session.user.id = user.id;
  session.user.activeParishId = parish.id;

  const week = await getOrCreateCurrentWeek(parish.id, new Date("2024-03-04T00:00:00.000Z"));
  const formData = new FormData();
  formData.set("weekId", week.id);
  formData.set("title", "");

  const beforeCount = await prisma.task.count({ where: { parishId: parish.id } });
  const result = await actions.createTask(taskState.initialTaskActionState, formData);
  const afterCount = await prisma.task.count({ where: { parishId: parish.id } });

  assert.equal(result.status, "error");
  assert.equal(beforeCount, afterCount);
});

test.skip("toggle done and undo", async () => {
  const parish = await prisma.parish.create({
    data: { name: "St. Rita", slug: "st-rita" }
  });
  const user = await prisma.user.create({
    data: {
      email: "toggle@example.com",
      name: "Owner",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });

  session.user.id = user.id;
  session.user.activeParishId = parish.id;

  const week = await getOrCreateCurrentWeek(parish.id, new Date("2024-04-01T00:00:00.000Z"));
  const task = await prisma.task.create({
    data: {
      parishId: parish.id,
      weekId: week.id,
      ownerId: user.id,
      createdById: user.id,
      title: "Confirm volunteer roster"
    }
  });

  await actions.markTaskDone({ taskId: task.id });
  const doneTask = await prisma.task.findUnique({ where: { id: task.id } });
  assert.equal(doneTask?.status, "DONE");

  await actions.unmarkTaskDone({ taskId: task.id });
  const undoneTask = await prisma.task.findUnique({ where: { id: task.id } });
  assert.equal(undoneTask?.status, "OPEN");
});

test.skip("archive and undo", async () => {
  const parish = await prisma.parish.create({
    data: { name: "St. Joseph", slug: "st-joseph" }
  });
  const user = await prisma.user.create({
    data: {
      email: "archive@example.com",
      name: "Owner",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });

  session.user.id = user.id;
  session.user.activeParishId = parish.id;

  const week = await getOrCreateCurrentWeek(parish.id, new Date("2024-05-06T00:00:00.000Z"));
  const task = await prisma.task.create({
    data: {
      parishId: parish.id,
      weekId: week.id,
      ownerId: user.id,
      createdById: user.id,
      title: "Archive me"
    }
  });

  await actions.archiveTask({ taskId: task.id });
  const archived = await prisma.task.findUnique({ where: { id: task.id } });
  assert.ok(archived?.archivedAt);

  await actions.unarchiveTask({ taskId: task.id });
  const restored = await prisma.task.findUnique({ where: { id: task.id } });
  assert.equal(restored?.archivedAt, null);
});
