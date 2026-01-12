import { getWeekEnd, getWeekStartMonday } from "@/domain/week";
import { getNow as defaultGetNow } from "@/lib/time/getNow";

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
  const start = getWeekStartMonday(resolveNow);
  const end = getWeekEnd(start);
  return { start, end };
}

export function getMonthRange({ now, getNow }: RangeOptions = {}): CalendarRange {
  const resolveNow = now ?? (getNow ?? defaultGetNow)();
  const start = new Date(resolveNow.getFullYear(), resolveNow.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(resolveNow.getFullYear(), resolveNow.getMonth() + 1, 1);
  end.setHours(0, 0, 0, 0);
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
