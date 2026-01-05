import { test } from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";
import { prisma } from "@/server/db/prisma";
import { buildParish } from "@/tests/unit/helpers/builders";

test("week helpers use Monday start and ISO label", async () => {
  const { getWeekStartMonday, getWeekEnd, getWeekLabel } = await import("@/domain/week");
  const now = new Date("2024-09-04T12:00:00.000Z");
  const startsOn = getWeekStartMonday(now);
  const endsOn = getWeekEnd(startsOn);

  assert.equal(startsOn.toISOString(), "2024-09-02T00:00:00.000Z");
  assert.equal(endsOn.toISOString(), "2024-09-09T00:00:00.000Z");
  assert.equal(getWeekLabel(startsOn), "2024-W36");
});

test("getOrCreateCurrentWeek creates current and next week on demand", async () => {
  const parish = buildParish();
  const storedWeeks: Array<{
    id: string;
    parishId: string;
    startsOn: Date;
    endsOn: Date;
    label: string;
  }> = [];

  const clock = mock.timers.enable({ now: new Date("2024-09-04T12:00:00.000Z") });

  mock.method(prisma.week, "findUnique", async ({ where }: any) => {
    const match = storedWeeks.find(
      (week) =>
        week.parishId === where.parishId_startsOn.parishId &&
        week.startsOn.getTime() === where.parishId_startsOn.startsOn.getTime()
    );
    return match ?? null;
  });

  mock.method(prisma.week, "create", async ({ data }: any) => {
    const week = { id: `week-${storedWeeks.length + 1}`, ...data };
    storedWeeks.push(week);
    return week;
  });

  mock.method(prisma.week, "upsert", async ({ where, create }: any) => {
    const existing = storedWeeks.find(
      (week) =>
        week.parishId === where.parishId_startsOn.parishId &&
        week.startsOn.getTime() === where.parishId_startsOn.startsOn.getTime()
    );

    if (existing) {
      return existing;
    }

    const week = { id: `week-${storedWeeks.length + 1}`, ...create };
    storedWeeks.push(week);
    return week;
  });

  const { getOrCreateCurrentWeek } = await import("@/domain/week");
  const currentWeek = await getOrCreateCurrentWeek(parish.id);

  assert.equal(currentWeek.startsOn.toISOString(), "2024-09-02T00:00:00.000Z");
  assert.equal(currentWeek.endsOn.toISOString(), "2024-09-09T00:00:00.000Z");
  assert.equal(currentWeek.label, "2024-W36");
  assert.ok(currentWeek.startsOn.getTime() <= Date.now());
  assert.ok(Date.now() < currentWeek.endsOn.getTime());

  assert.equal(storedWeeks.length, 2);
  const nextWeek = storedWeeks.find((week) => week.startsOn > currentWeek.startsOn);
  assert.ok(nextWeek);
  assert.equal(nextWeek?.startsOn.toISOString(), "2024-09-09T00:00:00.000Z");
  assert.equal(nextWeek?.endsOn.toISOString(), "2024-09-16T00:00:00.000Z");

  clock.restore();
  mock.restoreAll();
});
