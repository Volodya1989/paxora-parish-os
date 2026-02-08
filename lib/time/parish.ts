import { fromZonedTime, toZonedTime } from "date-fns-tz";

export const PARISH_TIMEZONE = process.env.PARISH_TIMEZONE ?? "America/New_York";

export function parseParishDateTime(date: string, time: string) {
  return fromZonedTime(`${date} ${time}`, PARISH_TIMEZONE);
}

export function getParishNow() {
  return toZonedTime(new Date(), PARISH_TIMEZONE);
}
