import { after, before, test, mock } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/server/db/prisma";
import { getWeekEnd, getWeekLabel, getWeekStartMonday } from "@/domain/week";
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

async function resetDatabase() {
  await prisma.announcement.deleteMany();
  await prisma.digest.deleteMany();
  await prisma.eventRsvp.deleteMany();
  await prisma.event.deleteMany();
  await prisma.task.deleteMany();
  await prisma.groupMembership.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.group.deleteMany();
  await prisma.week.deleteMany();
  await prisma.parish.deleteMany();
  await prisma.user.deleteMany();
}

let actions: typeof import("@/app/actions/rsvp");

before(async () => {
  if (!hasDatabase) {
    return;
  }
  await applyMigrations();
  actions = await loadModuleFromRoot("app/actions/rsvp");
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

dbTest.skip("setRsvp upserts per event and user", async () => {
  const parish = await prisma.parish.create({
    data: { name: "St. Luke", slug: "st-luke" }
  });
  const user = await prisma.user.create({
    data: {
      email: "member@example.com",
      name: "Member",
      passwordHash: "hashed",
      activeParishId: parish.id
    }
  });

  session.user.id = user.id;
  session.user.activeParishId = parish.id;

  const weekStart = getWeekStartMonday(new Date("2024-06-03T00:00:00.000Z"));
  const weekEnd = getWeekEnd(weekStart);
  const week = await prisma.week.create({
    data: {
      parishId: parish.id,
      startsOn: weekStart,
      endsOn: weekEnd,
      label: getWeekLabel(weekStart)
    }
  });

  const event = await prisma.event.create({
    data: {
      parishId: parish.id,
      weekId: week.id,
      title: "Community supper",
      startsAt: new Date("2024-06-05T18:00:00.000Z"),
      endsAt: new Date("2024-06-05T20:00:00.000Z"),
      location: "Parish hall"
    }
  });

  const firstResponse = await actions.setRsvp({ eventId: event.id, response: "YES" });
  assert.equal(firstResponse.response, "YES");

  const stored = await prisma.eventRsvp.findMany({
    where: {
      eventId: event.id,
      userId: user.id
    }
  });
  assert.equal(stored.length, 1);
  assert.equal(stored[0]?.response, "YES");

  const secondResponse = await actions.setRsvp({ eventId: event.id, response: "NO" });
  assert.equal(secondResponse.response, "NO");

  const updated = await prisma.eventRsvp.findMany({
    where: {
      eventId: event.id,
      userId: user.id
    }
  });
  assert.equal(updated.length, 1);
  assert.equal(updated[0]?.response, "NO");
});
