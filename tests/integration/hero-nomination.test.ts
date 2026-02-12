import { after, before, test, mock } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/server/db/prisma";
import { getOrCreateCurrentWeek } from "@/domain/week";
import { getThisWeekDataForUser } from "@/lib/queries/this-week";
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

type CreateHeroNomination = typeof import("@/server/actions/gratitude").createHeroNomination;
type PublishHeroNomination = typeof import("@/server/actions/gratitude").publishHeroNomination;

function resolveActionFn<T extends "createHeroNomination" | "publishHeroNomination">(
  moduleValue: unknown,
  actionName: T
): T extends "createHeroNomination" ? CreateHeroNomination : PublishHeroNomination {
  let current: unknown = moduleValue;
  for (let depth = 0; depth < 6; depth += 1) {
    if (!current || (typeof current !== "object" && typeof current !== "function")) {
      break;
    }

    const record = current as Record<string, unknown>;
    if (typeof record[actionName] === "function") {
      return record[actionName] as T extends "createHeroNomination"
        ? CreateHeroNomination
        : PublishHeroNomination;
    }

    if (!("default" in record)) {
      break;
    }

    current = record.default;
  }

  const keys =
    moduleValue && (typeof moduleValue === "object" || typeof moduleValue === "function")
      ? Object.keys(moduleValue as Record<string, unknown>).join(", ")
      : "<non-object module>";
  throw new Error(`Unable to load gratitude action '${actionName}'. Module keys: ${keys}`);
}

let createHeroNomination: CreateHeroNomination;
let publishHeroNomination: PublishHeroNomination;

before(async () => {
  if (!hasDatabase) {
    return;
  }
  await applyMigrations();
  const moduleValue = await import("@/server/actions/gratitude");
  createHeroNomination = resolveActionFn(moduleValue, "createHeroNomination");
  publishHeroNomination = resolveActionFn(moduleValue, "publishHeroNomination");
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

dbTest("nomination can be saved as draft and then published", async () => {
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

  await createHeroNomination({
    weekId: week.id,
    nomineeUserId: nominee.id,
    reason: "Showed up early every day."
  });

  const draft = await prisma.heroNomination.findFirst({
    where: { parishId: parish.id, weekId: week.id }
  });
  assert.ok(draft);
  assert.equal(draft.status, "DRAFT");
  assert.equal(draft.publishedAt, null);

  await publishHeroNomination({ nominationId: draft.id });

  const published = await prisma.heroNomination.findUnique({
    where: { id: draft.id },
    select: {
      status: true,
      publishedAt: true
    }
  });
  assert.equal(published?.status, "PUBLISHED");
  assert.ok(published?.publishedAt);

  const data = await getThisWeekDataForUser({
    parishId: parish.id,
    userId: nominator.id,
    weekSelection: "current",
    now
  });

  assert.equal(data.gratitudeSpotlight.items.length, 1);
  assert.match(data.gratitudeSpotlight.items[0]?.reason ?? "", /Showed up early/);
});
