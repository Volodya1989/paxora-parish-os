import { after, before, test, mock } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/server/db/prisma";
import { getOrCreateCurrentWeek } from "@/domain/week";
import { applyMigrations } from "../_helpers/migrate";
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
    revalidatePath: () => undefined,
    unstable_noStore: () => undefined
  }
});

async function resetDatabase() {
  await prisma.announcement.deleteMany();
  await prisma.event.deleteMany();
  await prisma.task.deleteMany();
  await prisma.groupMembership.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.group.deleteMany();
  await prisma.week.deleteMany();
  await prisma.parish.deleteMany();
  await prisma.user.deleteMany();
}

let homeQueries: any;

before(async () => {
  if (!hasDatabase) {
    return;
  }
  await applyMigrations();
  homeQueries = await loadModuleFromRoot("lib/queries/home");
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

dbTest("getHomeSummary returns stable week completion data", async () => {
  const fixedNow = new Date("2024-05-08T12:00:00.000Z");
  const parish = await prisma.parish.create({
    data: { name: "St. Luke", slug: "st-luke" }
  });
  const user = await prisma.user.create({
    data: {
      email: "home-summary@example.com",
      name: "Summary",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });

  session.user.id = user.id;
  session.user.activeParishId = parish.id;

  const week = await getOrCreateCurrentWeek(parish.id, fixedNow);

  await prisma.task.create({
    data: {
      parishId: parish.id,
      weekId: week.id,
      ownerId: user.id,
      createdById: user.id,
      displayId: "SERV-1",
      title: "Prepare worship slides",
      status: "DONE"
    }
  });

  await prisma.task.create({
    data: {
      parishId: parish.id,
      weekId: week.id,
      ownerId: user.id,
      createdById: user.id,
      displayId: "SERV-2",
      title: "Confirm volunteers",
      status: "OPEN"
    }
  });

  await prisma.event.create({
    data: {
      parishId: parish.id,
      weekId: week.id,
      title: "Evening prayer",
      startsAt: new Date("2024-05-09T19:00:00.000Z"),
      endsAt: new Date("2024-05-09T20:00:00.000Z"),
      location: "Chapel"
    }
  });

  await prisma.announcement.create({
    data: {
      parishId: parish.id,
      title: "Community dinner reminder",
      publishedAt: new Date("2024-05-07T10:00:00.000Z")
    }
  });

  const summary = await homeQueries.getHomeSummary({ now: fixedNow });

  assert.equal(summary.weekCompletion.completedCount, 1);
  assert.equal(summary.weekCompletion.totalCount, 2);
  assert.ok(summary.weekCompletion.percent >= 0);
  assert.ok(summary.weekCompletion.percent <= 100);
  assert.ok(Array.isArray(summary.recentUpdates));
  assert.ok(Array.isArray(summary.nextEvents));
  assert.ok(Array.isArray(summary.announcements));
});
