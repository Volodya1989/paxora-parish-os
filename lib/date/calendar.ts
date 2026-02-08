import { toZonedTime } from "date-fns-tz";
import { getWeekEnd, getWeekStartMonday } from "@/lib/date/week";
import { getNow as defaultGetNow } from "@/lib/time/getNow";
import { PARISH_TIMEZONE, parseParishDateTime } from "@/lib/time/parish";

export type CalendarRange = {
  start: Date;
  end: Date;
};

type RangeOptions = {
  now?: Date;
  getNow?: () => Date;
};

export function getWeekRange({ now, getNow }: RangeOptions = {}): CalendarRange {
  const resolveNow = now ?? (getNow ?? defaultGetNow)();
  const parishNow = toZonedTime(resolveNow, PARISH_TIMEZONE);
  const startLocal = getWeekStartMonday(parishNow);
  const endLocal = getWeekEnd(startLocal);
  const start = parseParishDateTime(formatDateInput(startLocal), "00:00:00");
  const end = parseParishDateTime(formatDateInput(endLocal), "00:00:00");
  return { start, end };
}

export function getMonthRange({ now, getNow }: RangeOptions = {}): CalendarRange {
  const resolveNow = now ?? (getNow ?? defaultGetNow)();
  const parishNow = toZonedTime(resolveNow, PARISH_TIMEZONE);
  const startLocal = new Date(parishNow.getFullYear(), parishNow.getMonth(), 1);
  const endLocal = new Date(parishNow.getFullYear(), parishNow.getMonth() + 1, 1);
  const start = parseParishDateTime(formatDateInput(startLocal), "00:00:00");
  const end = parseParishDateTime(formatDateInput(endLocal), "00:00:00");
  return { start, end };
}

export function getWeekDays(start: Date): Date[] {
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

export function getMonthGridDays(start: Date, end: Date): Date[] {
  const gridStart = getWeekStartMonday(start);
  let gridEnd = getWeekStartMonday(end);

  if (gridEnd.getTime() !== end.getTime()) {
    gridEnd = new Date(gridEnd);
    gridEnd.setDate(gridEnd.getDate() + 7);
  }

  const days: Date[] = [];
  const cursor = new Date(gridStart);
  while (cursor < gridEnd) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export function getDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}
