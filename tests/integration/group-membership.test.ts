import { after, before, test, mock } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/server/db/prisma";
import { resolveFromRoot } from "../_helpers/resolve";
import { applyMigrations } from "../_helpers/migrate";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const dbTest = test.skip;

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
  await prisma.groupMembership.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.group.deleteMany();
  await prisma.parish.deleteMany();
  await prisma.user.deleteMany();
}

let actions: typeof import("@/app/actions/members");

before(async () => {
  if (!hasDatabase) {
    return;
  }
  await applyMigrations();
  actions = await import(resolveFromRoot("app/actions/members"));
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

dbTest("invite, accept, role change, and remove", async () => {
  const parish = await prisma.parish.create({
    data: { name: "St. Lydia", slug: "st-lydia" }
  });
  const admin = await prisma.user.create({
    data: {
      email: "admin@example.com",
      name: "Admin",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });
  const parishioner = await prisma.user.create({
    data: {
      email: "member@example.com",
      name: "Member",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });
  const outsider = await prisma.user.create({
    data: {
      email: "outsider@example.com",
      name: "Outsider",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });

  await prisma.membership.createMany({
    data: [
      { parishId: parish.id, userId: admin.id, role: "ADMIN" },
      { parishId: parish.id, userId: parishioner.id, role: "MEMBER" },
      { parishId: parish.id, userId: outsider.id, role: "MEMBER" }
    ]
  });

  const group = await prisma.group.create({
    data: {
      parishId: parish.id,
      name: "Hospitality",
      description: "Welcome team"
    }
  });

  session.user.id = admin.id;
  session.user.activeParishId = parish.id;

  const inviteResult = await actions.inviteMember({
    groupId: group.id,
    email: parishioner.email,
    role: "MEMBER"
  });

  assert.equal(inviteResult.status, "success");

  const pendingInvite = await prisma.groupMembership.findUnique({
    where: {
      groupId_userId: {
        groupId: group.id,
        userId: parishioner.id
      }
    }
  });

  assert.equal(pendingInvite?.status, "INVITED");

  session.user.id = parishioner.id;
  session.user.activeParishId = parish.id;

  const acceptResult = await actions.acceptInvite({ groupId: group.id });
  assert.equal(acceptResult.status, "success");

  const activeMembership = await prisma.groupMembership.findUnique({
    where: {
      groupId_userId: {
        groupId: group.id,
        userId: parishioner.id
      }
    }
  });

  assert.equal(activeMembership?.status, "ACTIVE");

  session.user.id = admin.id;
  session.user.activeParishId = parish.id;

  const roleResult = await actions.changeMemberRole({
    groupId: group.id,
    userId: parishioner.id,
    role: "LEAD"
  });

  assert.equal(roleResult.status, "success");

  const updatedMembership = await prisma.groupMembership.findUnique({
    where: {
      groupId_userId: {
        groupId: group.id,
        userId: parishioner.id
      }
    }
  });

  assert.equal(updatedMembership?.role, "LEAD");

  const removeResult = await actions.removeMember({
    groupId: group.id,
    userId: parishioner.id
  });

  assert.equal(removeResult.status, "success");

  const removedMembership = await prisma.groupMembership.findUnique({
    where: {
      groupId_userId: {
        groupId: group.id,
        userId: parishioner.id
      }
    }
  });

  assert.equal(removedMembership, null);

  session.user.id = outsider.id;
  session.user.activeParishId = parish.id;

  const unauthorizedInvite = await actions.inviteMember({
    groupId: group.id,
    email: "newbie@example.com",
    role: "MEMBER"
  });

  assert.equal(unauthorizedInvite.status, "error");
  assert.equal(unauthorizedInvite.error, "NOT_AUTHORIZED");
});
