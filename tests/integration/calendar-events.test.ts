import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/server/db/prisma";
import { getWeekEnd, getWeekLabel, getWeekStartMonday } from "@/domain/week";
import { listEventsForMonth, listEventsForWeek } from "@/lib/queries/events";
import { applyMigrations } from "../_helpers/migrate";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const dbTest = hasDatabase ? test : test.skip;

async function resetDatabase() {
  await prisma.event.deleteMany();
  await prisma.task.deleteMany();
  await prisma.groupMembership.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.group.deleteMany();
  await prisma.week.deleteMany();
  await prisma.parish.deleteMany();
  await prisma.user.deleteMany();
}

before(async () => {
  if (!hasDatabase) {
    return;
  }
  await applyMigrations();
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

dbTest("list events by week and month with deterministic time", async () => {
  const fixedNow = new Date("2024-05-08T12:00:00.000Z");
  const parish = await prisma.parish.create({
    data: { name: "St. Brigid", slug: "st-brigid" }
  });

  const weekStart = getWeekStartMonday(fixedNow);
  const weekEnd = getWeekEnd(weekStart);
  const week = await prisma.week.create({
    data: {
      parishId: parish.id,
      startsOn: weekStart,
      endsOn: weekEnd,
      label: getWeekLabel(weekStart)
    }
  });

  const nextWeekStart = getWeekEnd(weekStart);
  const nextWeekEnd = getWeekEnd(nextWeekStart);
  const nextWeek = await prisma.week.create({
    data: {
      parishId: parish.id,
      startsOn: nextWeekStart,
      endsOn: nextWeekEnd,
      label: getWeekLabel(nextWeekStart)
    }
  });

  const firstEvent = await prisma.event.create({
    data: {
      parishId: parish.id,
      weekId: week.id,
      title: "Morning Mass",
      startsAt: new Date("2024-05-06T09:00:00.000Z"),
      endsAt: new Date("2024-05-06T10:00:00.000Z"),
      location: "Main chapel"
    }
  });

  const secondEvent = await prisma.event.create({
    data: {
      parishId: parish.id,
      weekId: week.id,
      title: "Choir rehearsal",
      startsAt: new Date("2024-05-07T18:00:00.000Z"),
      endsAt: new Date("2024-05-07T19:30:00.000Z"),
      location: "Choir room"
    }
  });

  const nextWeekEvent = await prisma.event.create({
    data: {
      parishId: parish.id,
      weekId: nextWeek.id,
      title: "Youth gathering",
      startsAt: new Date("2024-05-14T18:00:00.000Z"),
      endsAt: new Date("2024-05-14T19:30:00.000Z"),
      location: "Parish hall"
    }
  });

  const weekEvents = await listEventsForWeek({
    parishId: parish.id,
    getNow: () => fixedNow
  });

  assert.equal(weekEvents.length, 2);
  assert.equal(weekEvents[0]?.id, firstEvent.id);
  assert.equal(weekEvents[1]?.id, secondEvent.id);
  assert.ok(weekEvents[0]?.summary);

  const monthEvents = await listEventsForMonth({
    parishId: parish.id,
    getNow: () => fixedNow
  });

  assert.equal(monthEvents.length, 3);
  assert.equal(monthEvents[0]?.id, firstEvent.id);
  assert.equal(monthEvents[1]?.id, secondEvent.id);
  assert.equal(monthEvents[2]?.id, nextWeekEvent.id);
});

dbTest("weekly recurring events appear on selected weekdays", async () => {
  const fixedNow = new Date("2024-05-08T12:00:00.000Z");
  const parish = await prisma.parish.create({
    data: { name: "St. Phoebe", slug: "st-phoebe" }
  });

  const weekStart = getWeekStartMonday(fixedNow);
  const weekEnd = getWeekEnd(weekStart);
  const week = await prisma.week.create({
    data: {
      parishId: parish.id,
      startsOn: weekStart,
      endsOn: weekEnd,
      label: getWeekLabel(weekStart)
    }
  });

  const recurringEvent = await prisma.event.create({
    data: {
      parishId: parish.id,
      weekId: week.id,
      title: "Daily prayer",
      startsAt: new Date("2024-05-06T09:00:00.000Z"),
      endsAt: new Date("2024-05-06T09:30:00.000Z"),
      location: "Chapel",
      recurrenceFreq: "WEEKLY",
      recurrenceInterval: 1,
      recurrenceByWeekday: [1, 3, 5]
    }
  });

  const weekEvents = await listEventsForWeek({
    parishId: parish.id,
    getNow: () => fixedNow
  });

  const occurrences = weekEvents.filter((event) => event.id === recurringEvent.id);

  assert.equal(occurrences.length, 3);
  assert.deepEqual(
    occurrences.map((event) => event.startsAt.getDay()).sort(),
    [1, 3, 5]
  );
});
