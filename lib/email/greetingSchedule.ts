export function getParishLocalDateParts(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    hourCycle: "h23"
  }).formatToParts(now);

  const get = (type: "year" | "month" | "day" | "hour") =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = get("hour");

  return {
    month,
    day,
    hour,
    dateKey: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  };
}

export function shouldSendGreetingsThisHour(localHour: number, configuredHour: number | null | undefined) {
  const normalizedHour =
    typeof configuredHour === "number" && Number.isInteger(configuredHour) && configuredHour >= 0 && configuredHour <= 23
      ? configuredHour
      : 9;

  return localHour === normalizedHour;
}
