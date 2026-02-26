import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/server/db/prisma";
import { getWeekEnd, getWeekLabel, getWeekStartMonday } from "@/domain/week";
import { listEventsByRange } from "@/lib/queries/events";
import { applyMigrations } from "../_helpers/migrate";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const dbTest = hasDatabase ? test : test.skip;

async function resetDatabase() {
  await prisma.eventRecurrenceException.deleteMany();
  await prisma.event.deleteMany();
  await prisma.groupMembership.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.group.deleteMany();
  await prisma.week.deleteMany();
  await prisma.parish.deleteMany();
  await prisma.user.deleteMany();
}

before(async () => {
  if (!hasDatabase) return;
  await applyMigrations();
  await prisma.$connect();
  await resetDatabase();
});

after(async () => {
  if (!hasDatabase) return;
  await resetDatabase();
  await prisma.$disconnect();
});

dbTest("recurring events support single-occurrence deletion + override edits", async () => {
  const parish = await prisma.parish.create({ data: { name: "St Scope", slug: "st-scope" } });
  const weekStart = getWeekStartMonday(new Date("2026-03-02T00:00:00.000Z"));
  const week = await prisma.week.create({
    data: {
      parishId: parish.id,
      startsOn: weekStart,
      endsOn: getWeekEnd(weekStart),
      label: getWeekLabel(weekStart)
    }
  });

  const recurring = await prisma.event.create({
    data: {
      parishId: parish.id,
      weekId: week.id,
      title: "Morning Prayer",
      startsAt: new Date("2026-03-02T09:00:00.000Z"),
      endsAt: new Date("2026-03-02T10:00:00.000Z"),
      recurrenceFreq: "DAILY"
    }
  });

  const rangeStart = new Date("2026-03-02T00:00:00.000Z");
  const rangeEnd = new Date("2026-03-06T00:00:00.000Z");

  const beforeEvents = await listEventsByRange({ parishId: parish.id, start: rangeStart, end: rangeEnd });
  assert.equal(beforeEvents.filter((item) => item.id === recurring.id).length, 4);

  const occurrenceToDelete = new Date("2026-03-03T09:00:00.000Z");
  await prisma.eventRecurrenceException.create({
    data: {
      eventId: recurring.id,
      occurrenceStartsAt: occurrenceToDelete
    }
  });

  const overrideWeekStart = getWeekStartMonday(new Date("2026-03-04T08:00:00.000Z"));
  const overrideWeek = await prisma.week.upsert({
    where: { parishId_startsOn: { parishId: parish.id, startsOn: overrideWeekStart } },
    update: {},
    create: {
      parishId: parish.id,
      startsOn: overrideWeekStart,
      endsOn: getWeekEnd(overrideWeekStart),
      label: getWeekLabel(overrideWeekStart)
    }
  });

  await prisma.eventRecurrenceException.create({
    data: {
      eventId: recurring.id,
      occurrenceStartsAt: new Date("2026-03-04T09:00:00.000Z")
    }
  });

  await prisma.event.create({
    data: {
      parishId: parish.id,
      weekId: overrideWeek.id,
      title: "Morning Prayer (updated)",
      startsAt: new Date("2026-03-04T08:00:00.000Z"),
      endsAt: new Date("2026-03-04T09:15:00.000Z"),
      recurrenceParentId: recurring.id,
      recurrenceOriginalStartsAt: new Date("2026-03-04T09:00:00.000Z")
    }
  });

  const afterEvents = await listEventsByRange({ parishId: parish.id, start: rangeStart, end: rangeEnd });
  assert.equal(afterEvents.filter((item) => item.startsAt.toISOString() === occurrenceToDelete.toISOString()).length, 0);
  assert.equal(afterEvents.filter((item) => item.title.includes("updated")).length, 1);
});

dbTest("deleting a series removes base event and detached overrides", async () => {
  const parish = await prisma.parish.create({ data: { name: "St Series", slug: "st-series" } });
  const weekStart = getWeekStartMonday(new Date("2026-04-06T00:00:00.000Z"));
  const week = await prisma.week.create({
    data: {
      parishId: parish.id,
      startsOn: weekStart,
      endsOn: getWeekEnd(weekStart),
      label: getWeekLabel(weekStart)
    }
  });

  const recurring = await prisma.event.create({
    data: {
      parishId: parish.id,
      weekId: week.id,
      title: "Series Event",
      startsAt: new Date("2026-04-06T15:00:00.000Z"),
      endsAt: new Date("2026-04-06T16:00:00.000Z"),
      recurrenceFreq: "WEEKLY",
      recurrenceByWeekday: [1]
    }
  });

  const override = await prisma.event.create({
    data: {
      parishId: parish.id,
      weekId: week.id,
      title: "Series Event (override)",
      startsAt: new Date("2026-04-13T16:00:00.000Z"),
      endsAt: new Date("2026-04-13T17:00:00.000Z"),
      recurrenceParentId: recurring.id,
      recurrenceOriginalStartsAt: new Date("2026-04-13T15:00:00.000Z")
    }
  });

  await prisma.event.updateMany({
    where: { OR: [{ id: recurring.id }, { recurrenceParentId: recurring.id }] },
    data: { deletedAt: new Date() }
  });

  const [baseAfter, overrideAfter] = await Promise.all([
    prisma.event.findUnique({ where: { id: recurring.id } }),
    prisma.event.findUnique({ where: { id: override.id } })
  ]);

  assert.ok(baseAfter?.deletedAt);
  assert.ok(overrideAfter?.deletedAt);
});
