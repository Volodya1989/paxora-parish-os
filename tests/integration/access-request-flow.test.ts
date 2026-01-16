import { after, before, test, mock } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/server/db/prisma";
import { resolveFromRoot } from "../_helpers/resolve";
import { applyMigrations } from "../_helpers/migrate";

const hasDatabase = Boolean(process.env.DATABASE_URL);

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
  actions = await import(resolveFromRoot("app/actions/access"));
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

test.skip("request access and approve flow", async () => {
  const parish = await prisma.parish.create({
    data: { name: "St. Clare", slug: "st-clare" }
  });
  const user = await prisma.user.create({
    data: {
      email: "requester@example.com",
      name: "Requester",
      passwordHash: "hashed",
      activeParishId: parish.id
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

  await actions.approveParishAccess({ parishId: parish.id, userId: user.id });

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
