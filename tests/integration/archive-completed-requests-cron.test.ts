import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/server/db/prisma";
import { GET } from "@/app/api/cron/archive-completed-requests/route";
import { applyMigrations } from "../_helpers/migrate";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const dbTest = hasDatabase ? test : test.skip;

async function resetDatabase() {
  await prisma.request.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.parish.deleteMany();
  await prisma.user.deleteMany();
}

before(async () => {
  if (!hasDatabase) return;
  await applyMigrations();
  await prisma.$connect();
  await resetDatabase();
});

after(async () => {
  if (!hasDatabase) return;
  await resetDatabase();
  await prisma.$disconnect();
});

dbTest("cron archives only completed, unarchived, non-deleted requests and is idempotent", async () => {
  process.env.CRON_SECRET = "test-secret";

  const parish = await prisma.parish.create({ data: { name: "St. Mark", slug: "st-mark" } });
  const user = await prisma.user.create({
    data: {
      email: "cron-requests@example.com",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });

  await prisma.membership.create({ data: { parishId: parish.id, userId: user.id, role: "ADMIN" } });

  const completed = await prisma.request.create({
    data: {
      parishId: parish.id,
      createdByUserId: user.id,
      type: "GENERIC",
      status: "COMPLETED",
      visibilityScope: "ADMIN_ALL",
      title: "Completed target"
    }
  });

  await prisma.request.create({
    data: {
      parishId: parish.id,
      createdByUserId: user.id,
      type: "GENERIC",
      status: "COMPLETED",
      visibilityScope: "ADMIN_ALL",
      title: "Already archived",
      archivedAt: new Date("2025-01-01T00:00:00.000Z")
    }
  });

  await prisma.request.create({
    data: {
      parishId: parish.id,
      createdByUserId: user.id,
      type: "GENERIC",
      status: "COMPLETED",
      visibilityScope: "ADMIN_ALL",
      title: "Deleted completed",
      deletedAt: new Date("2025-01-01T00:00:00.000Z")
    }
  });

  await prisma.request.create({
    data: {
      parishId: parish.id,
      createdByUserId: user.id,
      type: "GENERIC",
      status: "CANCELED",
      visibilityScope: "ADMIN_ALL",
      title: "Canceled request"
    }
  });

  const request = new Request("http://localhost/api/cron/archive-completed-requests", {
    headers: { authorization: "Bearer test-secret" }
  });

  const first = await GET(request);
  const firstJson = await first.json();
  assert.equal(firstJson.archived, 1);

  const second = await GET(request);
  const secondJson = await second.json();
  assert.equal(secondJson.archived, 0);

  const completedAfter = await prisma.request.findUnique({ where: { id: completed.id } });
  assert.ok(completedAfter?.archivedAt);
});
