import { after, before, mock, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/server/db/prisma";
import { applyMigrations } from "../_helpers/migrate";
import { createParishInviteCode } from "@/lib/parish/inviteCode";
import { loadModuleFromRoot } from "../_helpers/load-module";

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

let parishActions: typeof import("@/app/actions/platformParishes");

async function resetDatabase() {
  await prisma.groupMembership.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.digest.deleteMany();
  await prisma.eventRequest.deleteMany();
  await prisma.request.deleteMany();
  await prisma.hoursEntry.deleteMany();
  await prisma.heroNomination.deleteMany();
  await prisma.task.deleteMany();
  await prisma.event.deleteMany();
  await prisma.group.deleteMany();
  await prisma.week.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.parish.deleteMany();
  await prisma.user.deleteMany();
}

before(async () => {
  if (!hasDatabase) return;
  await applyMigrations();
  parishActions = await loadModuleFromRoot("app/actions/platformParishes");
  await prisma.$connect();
  await resetDatabase();
});

after(async () => {
  if (!hasDatabase) return;
  await resetDatabase();
  await prisma.$disconnect();
});

async function createSuperAdmin(email: string) {
  return prisma.user.create({
    data: {
      email,
      name: "Platform Admin",
      passwordHash: "hashed",
      platformRole: "SUPERADMIN"
    }
  });
}

async function createDeactivatedParish(name: string, slug: string) {
  const code = await createParishInviteCode();
  return prisma.parish.create({
    data: {
      name,
      slug,
      inviteCode: code,
      inviteCodeCreatedAt: new Date(),
      deactivatedAt: new Date()
    }
  });
}

dbTest("super admin safe delete removes parish with active members and dependent data", async () => {
  const superAdmin = await createSuperAdmin("superadmin-delete@example.com");
  const parish = await createDeactivatedParish("St. Cleanup", "st-cleanup");

  const member = await prisma.user.create({
    data: {
      email: "cleanup-member@example.com",
      name: "Cleanup Member",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });

  await prisma.membership.create({
    data: { parishId: parish.id, userId: member.id, role: "MEMBER" }
  });

  const week = await prisma.week.create({
    data: {
      parishId: parish.id,
      startsOn: new Date("2026-01-05T00:00:00.000Z"),
      endsOn: new Date("2026-01-11T23:59:59.999Z"),
      label: "Jan 5 - Jan 11"
    }
  });

  const group = await prisma.group.create({
    data: {
      parishId: parish.id,
      createdById: member.id,
      name: "Cleanup Team"
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

  await prisma.announcement.create({
    data: {
      parishId: parish.id,
      title: "Cleanup notice",
      createdById: member.id
    }
  });

  session.user.id = superAdmin.id;
  session.user.activeParishId = parish.id;

  const result = await parishActions.safeDeletePlatformParish({ parishId: parish.id });

  assert.equal(result.status, "success");

  const deletedParish = await prisma.parish.findUnique({ where: { id: parish.id } });
  assert.equal(deletedParish, null);

  const membershipCount = await prisma.membership.count({ where: { parishId: parish.id } });
  const weekCount = await prisma.week.count({ where: { parishId: parish.id } });
  const groupCount = await prisma.group.count({ where: { parishId: parish.id } });
  const announcementCount = await prisma.announcement.count({ where: { parishId: parish.id } });
  assert.equal(membershipCount, 0);
  assert.equal(weekCount, 0);
  assert.equal(groupCount, 0);
  assert.equal(announcementCount, 0);

  const refreshedMember = await prisma.user.findUnique({
    where: { id: member.id },
    select: { activeParishId: true }
  });
  assert.equal(refreshedMember?.activeParishId, null);

  assert.ok(week.id);
});



dbTest("safe delete blocked when parish is not deactivated", async () => {
  const superAdmin = await createSuperAdmin("superadmin-active@example.com");
  const code = await createParishInviteCode();
  const parish = await prisma.parish.create({
    data: {
      name: "St. Active",
      slug: "st-active",
      inviteCode: code,
      inviteCodeCreatedAt: new Date()
    }
  });

  session.user.id = superAdmin.id;
  session.user.activeParishId = parish.id;

  const result = await parishActions.safeDeletePlatformParish({ parishId: parish.id });

  assert.equal(result.status, "error");
  assert.equal(result.error, "INVALID_STATE");

  const stillExists = await prisma.parish.findUnique({ where: { id: parish.id } });
  assert.ok(stillExists);
});

dbTest("regression: safe delete succeeds for deactivated parish with zero memberships", async () => {
  const superAdmin = await createSuperAdmin("superadmin-regression@example.com");
  const parish = await createDeactivatedParish("St. Regression", "st-regression");

  session.user.id = superAdmin.id;
  session.user.activeParishId = parish.id;

  const result = await parishActions.safeDeletePlatformParish({ parishId: parish.id });
  assert.equal(result.status, "success");

  const deletedParish = await prisma.parish.findUnique({ where: { id: parish.id } });
  assert.equal(deletedParish, null);
});

dbTest("non super admin cannot safe delete parish", async () => {
  const regularUser = await prisma.user.create({
    data: {
      email: "regular-user@example.com",
      name: "Regular User",
      passwordHash: "hashed"
    }
  });
  const parish = await createDeactivatedParish("St. Unauthorized", "st-unauthorized");

  session.user.id = regularUser.id;
  session.user.activeParishId = parish.id;

  const result = await parishActions.safeDeletePlatformParish({ parishId: parish.id });

  assert.equal(result.status, "error");
  assert.equal(result.error, "NOT_AUTHORIZED");

  const stillExists = await prisma.parish.findUnique({ where: { id: parish.id } });
  assert.ok(stillExists);
});
