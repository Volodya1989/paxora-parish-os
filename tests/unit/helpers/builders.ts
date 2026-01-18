let counter = 0;

function nextId(prefix: string) {
  counter += 1;
  return `${prefix}-${counter}`;
}

export function buildParish(overrides: Partial<{ id: string }> = {}) {
  return {
    id: overrides.id ?? nextId("parish")
  };
}

export function buildWeek(
  overrides: Partial<{
    id: string;
    parishId: string;
    startsOn: Date;
    endsOn: Date;
    label: string;
  }> = {}
) {
  const startsOn = overrides.startsOn ?? new Date("2024-09-02T00:00:00.000Z");
  const endsOn = overrides.endsOn ?? new Date(startsOn.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    id: overrides.id ?? nextId("week"),
    parishId: overrides.parishId ?? nextId("parish"),
    startsOn,
    endsOn,
    label: overrides.label ?? "2024-W36"
  };
}

export function buildTask(
  overrides: Partial<{
    id: string;
    parishId: string;
    weekId: string;
    ownerId: string;
    title: string;
    notes?: string | null;
    groupId?: string | null;
    status: "OPEN" | "IN_PROGRESS" | "DONE";
    rolledFromTaskId?: string | null;
  }> = {}
) {
  return {
    id: overrides.id ?? nextId("task"),
    parishId: overrides.parishId ?? nextId("parish"),
    weekId: overrides.weekId ?? nextId("week"),
    ownerId: overrides.ownerId ?? nextId("user"),
    title: overrides.title ?? "Task",
    notes: overrides.notes ?? null,
    groupId: overrides.groupId ?? null,
    status: overrides.status ?? "OPEN",
    rolledFromTaskId: overrides.rolledFromTaskId ?? null
  };
}

export function buildEvent(
  overrides: Partial<{
    title: string;
    startsAt: Date;
    endsAt: Date;
    location?: string | null;
  }> = {}
) {
  return {
    title: overrides.title ?? "Event",
    startsAt: overrides.startsAt ?? new Date("2024-09-05T09:00:00.000Z"),
    endsAt: overrides.endsAt ?? new Date("2024-09-05T10:00:00.000Z"),
    location: overrides.location ?? null
  };
}
