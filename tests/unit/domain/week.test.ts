import { test } from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";
import { loadModuleFromRoot } from "../../_helpers/load-module";
import { resolveFromRoot } from "../../_helpers/resolve";
import { buildParish } from "@/tests/unit/helpers/builders";

const mockModule = (mock as any).module.bind(mock) as (
  specifier: string,
  options: { namedExports?: Record<string, unknown> }
) => void;
const prisma = {
  week: {
    findUnique: async () => null,
    create: async () => ({}),
    upsert: async () => ({})
  }
};

mockModule(resolveFromRoot("server/db/prisma"), {
  namedExports: {
    prisma
  }
});

test("week helpers use Monday start and ISO label", async () => {
  const { getWeekStartMonday, getWeekEnd, getWeekLabel } = await loadModuleFromRoot<
    typeof import("@/domain/week")
  >("domain/week");
  const now = new Date("2024-09-04T12:00:00.000Z");
  const startsOn = getWeekStartMonday(now);
  const endsOn = getWeekEnd(startsOn);
  const expectedStart = new Date(2024, 8, 2, 0, 0, 0, 0);
  const expectedEnd = new Date(2024, 8, 9, 0, 0, 0, 0);

  assert.equal(startsOn.getTime(), expectedStart.getTime());
  assert.equal(endsOn.getTime(), expectedEnd.getTime());
  assert.equal(getWeekLabel(startsOn), "2024-W36");
});

test("week helpers handle Sunday boundary and year rollover labels", async () => {
  const { getWeekStartMonday, getWeekLabel } = await loadModuleFromRoot<
    typeof import("@/domain/week")
  >("domain/week");
  const sunday = new Date(2023, 11, 31, 12, 0, 0, 0);
  const sundayStart = getWeekStartMonday(sunday);
  const expectedSundayStart = new Date(2023, 11, 25, 0, 0, 0, 0);

  assert.equal(sundayStart.getTime(), expectedSundayStart.getTime());
  assert.equal(getWeekLabel(sundayStart), "2023-W52");

  const monday = new Date(2024, 0, 1, 8, 0, 0, 0);
  const mondayStart = getWeekStartMonday(monday);
  const expectedMondayStart = new Date(2024, 0, 1, 0, 0, 0, 0);

  assert.equal(mondayStart.getTime(), expectedMondayStart.getTime());
  assert.equal(getWeekLabel(mondayStart), "2024-W01");
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

  const RealDate = Date;
  const fixedNow = new RealDate("2024-09-04T12:00:00.000Z");
  global.Date = class extends RealDate {
    constructor(...args: ConstructorParameters<DateConstructor>) {
      if (args.length === 0) {
        return new RealDate(fixedNow);
      }
      return new RealDate(...args);
    }

    static now() {
      return fixedNow.getTime();
    }
  } as DateConstructor;

  const originalFindUnique = prisma.week.findUnique;
  const originalCreate = prisma.week.create;
  const originalUpsert = prisma.week.upsert;

  prisma.week.findUnique = async ({ where }: any) => {
    const match = storedWeeks.find(
      (week) =>
        week.parishId === where.parishId_startsOn.parishId &&
        week.startsOn.getTime() === where.parishId_startsOn.startsOn.getTime()
    );
    return match ?? null;
  };

  prisma.week.create = async ({ data }: any) => {
    const week = { id: `week-${storedWeeks.length + 1}`, ...data };
    storedWeeks.push(week);
    return week;
  };

  prisma.week.upsert = async ({ where, create }: any) => {
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
  };

  const { getOrCreateCurrentWeek } = await loadModuleFromRoot<typeof import("@/domain/week")>(
    "domain/week"
  );
  const currentWeek = await getOrCreateCurrentWeek(parish.id);

  assert.equal(currentWeek.startsOn.getTime(), new Date(2024, 8, 2, 0, 0, 0, 0).getTime());
  assert.equal(currentWeek.endsOn.getTime(), new Date(2024, 8, 9, 0, 0, 0, 0).getTime());
  assert.equal(currentWeek.label, "2024-W36");
  assert.ok(currentWeek.startsOn.getTime() <= Date.now());
  assert.ok(Date.now() < currentWeek.endsOn.getTime());

  assert.equal(storedWeeks.length, 2);
  const nextWeek = storedWeeks.find((week) => week.startsOn > currentWeek.startsOn);
  assert.ok(nextWeek);
  assert.equal(nextWeek?.startsOn.getTime(), new Date(2024, 8, 9, 0, 0, 0, 0).getTime());
  assert.equal(nextWeek?.endsOn.getTime(), new Date(2024, 8, 16, 0, 0, 0, 0).getTime());

  global.Date = RealDate;
  prisma.week.findUnique = originalFindUnique;
  prisma.week.create = originalCreate;
  prisma.week.upsert = originalUpsert;
});
