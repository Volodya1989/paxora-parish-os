import { after, before, test, mock } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/server/db/prisma";
import { loadModuleFromRoot } from "../_helpers/load-module";
import { applyMigrations } from "../_helpers/migrate";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const dbTest = hasDatabase ? test : test.skip;

const session = {
  user: {
    id: "",
    activeParishId: "",
    name: "Test User",
    email: "test@example.com"
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
  await prisma.request.deleteMany();
  await prisma.eventRsvp.deleteMany();
  await prisma.event.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.parish.deleteMany();
  await prisma.user.deleteMany();
}

let actions: any;

before(async () => {
  if (!hasDatabase) return;
  await applyMigrations();
  actions = await loadModuleFromRoot("server/actions/requests");
  await prisma.$connect();
  await resetDatabase();
});

after(async () => {
  if (!hasDatabase) return;
  await resetDatabase();
  await prisma.$disconnect();
});

dbTest("parishioner delete is allowed only for completed/canceled own requests", async () => {
  const parish = await prisma.parish.create({ data: { name: "St. John", slug: "st-john" } });
  const member = await prisma.user.create({
    data: {
      email: "member-requests@example.com",
      name: "Member",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });
  const other = await prisma.user.create({
    data: {
      email: "other-requests@example.com",
      name: "Other",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });

  await prisma.membership.createMany({
    data: [
      { parishId: parish.id, userId: member.id, role: "MEMBER" },
      { parishId: parish.id, userId: other.id, role: "MEMBER" }
    ]
  });

  const completed = await prisma.request.create({
    data: {
      parishId: parish.id,
      createdByUserId: member.id,
      type: "GENERIC",
      status: "COMPLETED",
      visibilityScope: "ADMIN_ALL",
      title: "Completed request"
    }
  });

  const submitted = await prisma.request.create({
    data: {
      parishId: parish.id,
      createdByUserId: member.id,
      type: "GENERIC",
      status: "SUBMITTED",
      visibilityScope: "ADMIN_ALL",
      title: "Submitted request"
    }
  });

  const completedByOther = await prisma.request.create({
    data: {
      parishId: parish.id,
      createdByUserId: other.id,
      type: "GENERIC",
      status: "COMPLETED",
      visibilityScope: "ADMIN_ALL",
      title: "Other member request"
    }
  });

  session.user.id = member.id;
  session.user.activeParishId = parish.id;

  const deleted = await actions.deleteOwnRequest({ requestId: completed.id });
  assert.equal(deleted.status, "success");

  const completedAfter = await prisma.request.findUnique({ where: { id: completed.id } });
  assert.ok(completedAfter?.deletedAt);

  const blocked = await actions.deleteOwnRequest({ requestId: submitted.id });
  assert.equal(blocked.status, "error");
  assert.equal(blocked.message, "To delete this request, cancel it first.");

  const notOwner = await actions.deleteOwnRequest({ requestId: completedByOther.id });
  assert.equal(notOwner.status, "error");
});

dbTest("admin archive is allowed only for completed/canceled requests", async () => {
  const parish = await prisma.parish.create({ data: { name: "St. Luke", slug: "st-luke" } });
  const admin = await prisma.user.create({
    data: {
      email: "admin-requests@example.com",
      name: "Admin",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });
  const member = await prisma.user.create({
    data: {
      email: "member-2-requests@example.com",
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

  const submitted = await prisma.request.create({
    data: {
      parishId: parish.id,
      createdByUserId: member.id,
      type: "GENERIC",
      status: "SUBMITTED",
      visibilityScope: "ADMIN_ALL",
      title: "Archive blocked"
    }
  });

  const completed = await prisma.request.create({
    data: {
      parishId: parish.id,
      createdByUserId: member.id,
      type: "GENERIC",
      status: "COMPLETED",
      visibilityScope: "ADMIN_ALL",
      title: "Archive allowed"
    }
  });

  session.user.id = admin.id;
  session.user.activeParishId = parish.id;

  const blocked = await actions.archiveRequest({ requestId: submitted.id });
  assert.equal(blocked.status, "error");
  assert.equal(blocked.message, "This request must be canceled or completed before it can be archived.");

  const archived = await actions.archiveRequest({ requestId: completed.id });
  assert.equal(archived.status, "success");

  const completedAfter = await prisma.request.findUnique({ where: { id: completed.id } });
  assert.ok(completedAfter?.archivedAt);
});
