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

mock.module("next/headers", {
  namedExports: {
    cookies: async () => ({ get: () => undefined })
  }
});

mock.module("next/navigation", {
  namedExports: {
    redirect: () => undefined
  }
});

async function resetDatabase() {
  await prisma.accessRequest.deleteMany();
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

let actions: typeof import("@/app/actions/access");

before(async () => {
  if (!hasDatabase) {
    return;
  }
  await applyMigrations();
  actions = await loadModuleFromRoot("app/actions/access");
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

dbTest("request access and approve flow", async () => {
  const parish = await prisma.parish.create({
    data: { name: "St. Clare", slug: "st-clare" }
  });
  const user = await prisma.user.create({
    data: {
      email: "requester@example.com",
      name: "Requester",
      passwordHash: "hashed",
      activeParishId: parish.id,
      emailVerifiedAt: new Date()
    }
  });
  const approver = await prisma.user.create({
    data: {
      email: "leader@example.com",
      name: "Leader",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });
  await prisma.membership.create({
    data: {
      parishId: parish.id,
      userId: approver.id,
      role: "SHEPHERD"
    }
  });

  session.user.id = user.id;
  session.user.activeParishId = parish.id;

  const formData = new FormData();
  formData.set("parishId", parish.id);

  await actions.requestParishAccess(formData);

  const pendingRequest = await prisma.accessRequest.findUnique({
    where: {
      parishId_userId: {
        parishId: parish.id,
        userId: user.id
      }
    }
  });

  assert.ok(pendingRequest);
  assert.equal(pendingRequest?.status, "PENDING");

  session.user.id = approver.id;
  session.user.activeParishId = parish.id;

  await actions.approveParishAccess({
    parishId: parish.id,
    userId: user.id,
    role: "MEMBER"
  });

  const membership = await prisma.membership.findUnique({
    where: {
      parishId_userId: {
        parishId: parish.id,
        userId: user.id
      }
    }
  });

  const approvedRequest = await prisma.accessRequest.findUnique({
    where: {
      parishId_userId: {
        parishId: parish.id,
        userId: user.id
      }
    }
  });

  assert.ok(membership);
  assert.equal(approvedRequest?.status, "APPROVED");
});
