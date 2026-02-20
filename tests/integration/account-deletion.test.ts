import { after, before, mock, test } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { prisma } from "@/server/db/prisma";
import { applyMigrations } from "../_helpers/migrate";
import { loadModuleFromRoot } from "../_helpers/load-module";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const dbTest = hasDatabase ? test : test.skip;

const session = {
  user: {
    id: "",
    activeParishId: "",
    platformRole: null as "SUPERADMIN" | null
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
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.pushSubscription.deleteMany();
  await prisma.accessRequest.deleteMany();
  await prisma.groupMembership.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.parish.deleteMany();
  await prisma.user.deleteMany();
}

let accountActions: any;
let peopleActions: any;
let authOptions: any;

before(async () => {
  if (!hasDatabase) {
    return;
  }

  await applyMigrations();
  accountActions = await loadModuleFromRoot("app/actions/account");
  peopleActions = await loadModuleFromRoot("app/actions/people");
  authOptions = (await loadModuleFromRoot<typeof import("@/server/auth/options")>("server/auth/options")).authOptions;
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

dbTest("self delete anonymizes account, removes memberships, and blocks credential auth", async () => {
  const parish = await prisma.parish.create({
    data: { name: "St. Delete", slug: "st-delete-self" }
  });

  const password = "secret123";
  const user = await prisma.user.create({
    data: {
      email: "self-delete@example.com",
      name: "Self Delete",
      passwordHash: await bcrypt.hash(password, 10),
      activeParishId: parish.id
    }
  });

  await prisma.membership.create({
    data: { parishId: parish.id, userId: user.id, role: "MEMBER" }
  });

  session.user.id = user.id;
  session.user.activeParishId = parish.id;
  session.user.platformRole = null;

  const result = await accountActions.deleteOwnAccount({ confirmation: "DELETE" });
  assert.equal(result.status, "success");

  const deletedUser = await prisma.user.findUnique({ where: { id: user.id } });
  assert.ok(deletedUser?.deletedAt);
  assert.equal(deletedUser?.name, "Deleted User");
  assert.equal(deletedUser?.activeParishId, null);

  const membershipCount = await prisma.membership.count({ where: { userId: user.id } });
  assert.equal(membershipCount, 0);

  const credentialsProvider = authOptions.providers[0] as any;
  const authorized = await credentialsProvider.options.authorize({
    email: "self-delete@example.com",
    password
  });
  assert.equal(authorized, null);
});

dbTest("platform admin can fully delete another user", async () => {
  const parish = await prisma.parish.create({
    data: { name: "St. Delete Admin", slug: "st-delete-admin" }
  });

  const [admin, target] = await Promise.all([
    prisma.user.create({
      data: {
        email: "platform-admin@example.com",
        name: "Platform Admin",
        passwordHash: await bcrypt.hash("admin-secret", 10),
        activeParishId: parish.id,
        platformRole: "SUPERADMIN"
      }
    }),
    prisma.user.create({
      data: {
        email: "target-delete@example.com",
        name: "Delete Target",
        passwordHash: await bcrypt.hash("target-secret", 10),
        activeParishId: parish.id
      }
    })
  ]);

  await prisma.membership.createMany({
    data: [
      { parishId: parish.id, userId: admin.id, role: "ADMIN" },
      { parishId: parish.id, userId: target.id, role: "MEMBER" }
    ]
  });

  session.user.id = admin.id;
  session.user.activeParishId = parish.id;
  session.user.platformRole = "SUPERADMIN";

  const result = await peopleActions.deleteUser({ userId: target.id });
  assert.equal(result.status, "success");

  const targetAfter = await prisma.user.findUnique({ where: { id: target.id } });
  assert.ok(targetAfter?.deletedAt);
  assert.equal(await prisma.membership.count({ where: { userId: target.id } }), 0);
});

dbTest("deleting the last platform admin is blocked", async () => {
  const parish = await prisma.parish.create({
    data: { name: "St. Last Admin", slug: "st-last-admin" }
  });

  const admin = await prisma.user.create({
    data: {
      email: "last-platform-admin@example.com",
      name: "Last Admin",
      passwordHash: await bcrypt.hash("admin-secret", 10),
      activeParishId: parish.id,
      platformRole: "SUPERADMIN"
    }
  });

  await prisma.membership.create({
    data: { parishId: parish.id, userId: admin.id, role: "ADMIN" }
  });

  session.user.id = admin.id;
  session.user.activeParishId = parish.id;
  session.user.platformRole = "SUPERADMIN";

  const result = await peopleActions.deleteUser({ userId: admin.id });
  assert.equal(result.status, "error");
  assert.equal(result.error, "SELF_DELETE_BLOCKED");

  const stillActive = await prisma.user.findUnique({ where: { id: admin.id } });
  assert.equal(stillActive?.deletedAt, null);
});
