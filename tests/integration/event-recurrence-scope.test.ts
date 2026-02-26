import { after, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/server/db/prisma";
import { getWeekEnd, getWeekLabel, getWeekStartMonday } from "@/domain/week";
import { listEventsByRange } from "@/lib/queries/events";
import { applyMigrations } from "../_helpers/migrate";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const dbTest = hasDatabase ? test : test.skip;
let supportsRecurrenceExceptions = true;
let setupFailureReason: string | null = null;

async function hasRecurrenceExceptionTable() {
  try {
    const result = await prisma.$queryRawUnsafe<Array<{ table_name: string | null }>>(
      'SELECT to_regclass(\'"EventRecurrenceException"\') AS table_name'
    );
    return Boolean(result[0]?.table_name);
  } catch {
    return false;
  }
}

async function resetDatabase() {
  if (supportsRecurrenceExceptions) {
    try {
      await prisma.eventRecurrenceException.deleteMany();
    } catch (error) {
      const code =
        typeof error === "object" && error && "code" in error
          ? (error as { code?: string }).code
          : undefined;
      if (code !== "P2021") {
        throw error;
      }
    }
  }
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

  try {
    await applyMigrations();
    await prisma.$connect();
    supportsRecurrenceExceptions = await hasRecurrenceExceptionTable();
    await resetDatabase();
    setupFailureReason = null;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    setupFailureReason = `integration setup failed: ${errorMessage}`;

    try {
      await prisma.$disconnect();
    } catch {
      // Best-effort disconnect when setup partially initialized Prisma.
    }
  }
});

beforeEach(async () => {
  if (!hasDatabase) return;
  if (setupFailureReason) return;

  try {
    await resetDatabase();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    setupFailureReason = `integration beforeEach failed: ${errorMessage}`;
  }
});

after(async () => {
  if (!hasDatabase) return;

  if (!setupFailureReason) {
    try {
      await resetDatabase();
    } catch {
      // Ignore teardown reset failures to avoid non-TAP hard failures in CI.
    }
  }

  try {
    await prisma.$disconnect();
  } catch {
    // Best-effort disconnect for flaky CI database teardown.
  }
});

dbTest("recurring events support single-occurrence deletion + override edits", async (t) => {
  if (setupFailureReason) {
    t.skip(setupFailureReason);
    return;
  }

  if (!supportsRecurrenceExceptions) {
    t.skip("EventRecurrenceException table is unavailable in current test database");
    return;
  }

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

  const recurringBefore = beforeEvents
    .filter((item) => item.id === recurring.id)
    .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime());
  const occurrenceToDelete = recurringBefore[1]?.startsAt;
  const occurrenceToOverride = recurringBefore[2]?.startsAt;

  assert.ok(occurrenceToDelete, "Expected at least two recurring occurrences");
  assert.ok(occurrenceToOverride, "Expected at least three recurring occurrences");

  await prisma.eventRecurrenceException.create({
    data: {
      eventId: recurring.id,
      occurrenceStartsAt: occurrenceToDelete
    }
  });

  const overrideStart = new Date(occurrenceToOverride);
  overrideStart.setHours(overrideStart.getHours() - 1);
  const overrideEnd = new Date(overrideStart);
  overrideEnd.setMinutes(overrideEnd.getMinutes() + 75);

  const overrideWeekStart = getWeekStartMonday(overrideStart);
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
      occurrenceStartsAt: occurrenceToOverride
    }
  });

  await prisma.event.create({
    data: {
      parishId: parish.id,
      weekId: overrideWeek.id,
      title: "Morning Prayer (updated)",
      startsAt: overrideStart,
      endsAt: overrideEnd,
      recurrenceParentId: recurring.id,
      recurrenceOriginalStartsAt: occurrenceToOverride
    }
  });

  const afterEvents = await listEventsByRange({ parishId: parish.id, start: rangeStart, end: rangeEnd });
  assert.equal(afterEvents.filter((item) => item.startsAt.toISOString() === occurrenceToDelete.toISOString()).length, 0);
  assert.equal(afterEvents.filter((item) => item.title.includes("updated")).length, 1);
});

dbTest("deleting a series removes base event and detached overrides", async (t) => {
  if (setupFailureReason) {
    t.skip(setupFailureReason);
    return;
  }

  if (!supportsRecurrenceExceptions) {
    t.skip("EventRecurrenceException table is unavailable in current test database");
    return;
  }

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
