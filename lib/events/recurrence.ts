import type { EventRecurrenceFrequency } from "@prisma/client";

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type RecurrenceInput = {
  recurrenceFreq: EventRecurrenceFrequency;
  recurrenceByWeekday?: number[];
};

export function formatRecurrenceSummary({
  recurrenceFreq,
  recurrenceByWeekday
}: RecurrenceInput) {
  if (recurrenceFreq === "NONE") {
    return "Does not repeat";
  }

  if (recurrenceFreq === "DAILY") {
    return "Repeats daily";
  }

  const days = [...(recurrenceByWeekday ?? [])]
    .sort((a, b) => a - b)
    .map((day) => dayLabels[day])
    .filter(Boolean);

  if (days.length === 0) {
    return "Repeats weekly";
  }

  if (days.length === 1) {
    return `Repeats weekly on ${days[0]}`;
  }

  return `Repeats on ${days.join(", ")}`;
}
