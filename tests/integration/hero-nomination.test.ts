import { after, before, test, mock } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/server/db/prisma";
import { getOrCreateCurrentWeek } from "@/domain/week";
import { getThisWeekDataForUser } from "@/lib/queries/this-week";
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
  await prisma.heroNomination.deleteMany();
  await prisma.hoursEntry.deleteMany();
  await prisma.task.deleteMany();
  await prisma.groupMembership.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.group.deleteMany();
  await prisma.week.deleteMany();
  await prisma.parish.deleteMany();
  await prisma.user.deleteMany();
}

let actions: typeof import("@/server/actions/gratitude");

before(async () => {
  if (!hasDatabase) {
    return;
  }
  await applyMigrations();
  actions = await loadModuleFromRoot("server/actions/gratitude");
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

dbTest("nominate and publish shows up in This Week spotlight", async () => {
  const parish = await prisma.parish.create({
    data: { name: "St. Luke", slug: "st-luke" }
  });
  const nominator = await prisma.user.create({
    data: {
      email: "leader@example.com",
      name: "Leader",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });
  const nominee = await prisma.user.create({
    data: {
      email: "nominee@example.com",
      name: "Nominee",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });

  await prisma.membership.createMany({
    data: [
      { parishId: parish.id, userId: nominator.id, role: "ADMIN" },
      { parishId: parish.id, userId: nominee.id, role: "MEMBER" }
    ]
  });

  session.user.id = nominator.id;
  session.user.activeParishId = parish.id;

  const now = new Date("2024-09-02T12:00:00.000Z");
  const week = await getOrCreateCurrentWeek(parish.id, now);

  await actions.createHeroNomination({
    weekId: week.id,
    nomineeUserId: nominee.id,
    reason: "Showed up early every day."
  });

  const draft = await prisma.heroNomination.findFirst({
    where: { parishId: parish.id, weekId: week.id }
  });
  assert.ok(draft);

  await actions.publishHeroNomination({ nominationId: draft?.id ?? "" });

  const data = await getThisWeekDataForUser({
    parishId: parish.id,
    userId: nominator.id,
    weekSelection: "current",
    now
  });

  assert.equal(data.gratitudeSpotlight.items.length, 1);
  assert.match(data.gratitudeSpotlight.items[0]?.reason ?? "", /Showed up early/);
});
