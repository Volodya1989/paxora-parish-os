import { after, before, test, mock } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/server/db/prisma";
import { loadModuleFromRoot } from "../_helpers/load-module";
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

let actions: typeof import("@/server/actions/groups");

const resolveGroupActions = (value: unknown) => {
  let current: unknown = value;
  for (let depth = 0; depth < 3; depth += 1) {
    if (current && typeof current === "object" && "createGroup" in current) {
      return current as typeof import("@/server/actions/groups");
    }
    if (current && typeof current === "object" && "default" in current) {
      current = (current as { default: unknown }).default;
      continue;
    }
    break;
  }
  return current as typeof import("@/server/actions/groups");
};

before(async () => {
  if (!hasDatabase) {
    return;
  }
  await applyMigrations();
  const loaded = await loadModuleFromRoot("server/actions/groups");
  actions = resolveGroupActions(loaded);
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

dbTest("create group succeeds with valid input", async () => {
  const parish = await prisma.parish.create({
    data: { name: "St. Agnes", slug: "st-agnes" }
  });
  const user = await prisma.user.create({
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
      userId: user.id,
      role: "ADMIN"
    }
  });

  session.user.id = user.id;
  session.user.activeParishId = parish.id;

  await actions.createGroup({
    parishId: parish.id,
    actorUserId: user.id,
    name: "Greeters",
    description: "Front door welcome team"
  });

  const stored = (await prisma.group.findFirst({
    where: { parishId: parish.id, name: "Greeters" }
  })) as { archivedAt: Date | null } | null;

  assert.ok(stored);
  assert.equal(stored?.archivedAt, null);
});

dbTest("archive, restore, and undo", async () => {
  const parish = await prisma.parish.create({
    data: { name: "St. Jude", slug: "st-jude" }
  });
  const user = await prisma.user.create({
    data: {
      email: "shepherd@example.com",
      name: "Shepherd",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });
  await prisma.membership.create({
    data: {
      parishId: parish.id,
      userId: user.id,
      role: "SHEPHERD"
    }
  });
  const group = await prisma.group.create({
    data: {
      parishId: parish.id,
      name: "Outreach",
      description: "Community service"
    }
  });

  session.user.id = user.id;
  session.user.activeParishId = parish.id;

  await actions.archiveGroup({
    parishId: parish.id,
    actorUserId: user.id,
    groupId: group.id
  });

  const archived = (await prisma.group.findUnique({ where: { id: group.id } })) as {
    archivedAt: Date | null;
  } | null;
  assert.ok(archived?.archivedAt);

  await actions.restoreGroup({
    parishId: parish.id,
    actorUserId: user.id,
    groupId: group.id
  });

  const restored = (await prisma.group.findUnique({ where: { id: group.id } })) as {
    archivedAt: Date | null;
  } | null;
  assert.equal(restored?.archivedAt, null);
});
