export const GREETING_MINUTE_INTERVAL = 15;

const LEGACY_UTC_OFFSET_REGEX = /^UTC([+-])(\d{1,2})(?::?(\d{2}))?$/i;

export function buildQuarterHourTimeOptions() {
  const options: Array<{ value: string; label: string; hour: number; minute: number }> = [];

  for (let hour = 0; hour < 24; hour += 1) {
    for (let minute = 0; minute < 60; minute += GREETING_MINUTE_INTERVAL) {
      const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      options.push({ value, label: value, hour, minute });
    }
  }

  return options;
}

export function parseGreetingLocalTime(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  if (minute % GREETING_MINUTE_INTERVAL !== 0) {
    return null;
  }

  return { hour, minute };
}

export function shouldRunGreetingForParishTime(input: {
  nowHour: number;
  nowMinute: number;
  sendHourLocal: number;
  sendMinuteLocal: number;
}) {
  const nowTotalMinutes = input.nowHour * 60 + input.nowMinute;
  const sendTotalMinutes = input.sendHourLocal * 60 + input.sendMinuteLocal;
  const diff = nowTotalMinutes - sendTotalMinutes;

  // Match if current time is within [sendTime, sendTime + 14 minutes].
  // A cron running every 15 minutes will hit each window exactly once.
  // Idempotency via GreetingEmailLog prevents duplicate sends even if
  // the cron fires twice inside the same window.
  return diff >= 0 && diff < GREETING_MINUTE_INTERVAL;
}

export function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function parseLegacyUtcOffset(timezone: string) {
  const match = LEGACY_UTC_OFFSET_REGEX.exec(timezone.trim());
  if (!match) {
    return null;
  }

  const sign = match[1] === "+" ? 1 : -1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? "0");
  if (hours > 14 || minutes > 59) {
    return null;
  }

  return sign * (hours * 60 + minutes);
}

export function isLegacyUtcOffsetTimezone(timezone: string) {
  return parseLegacyUtcOffset(timezone) !== null;
}

export function getParishLocalDateParts(nowUtc: Date, timezone: string) {
  const offsetMinutes = parseLegacyUtcOffset(timezone);

  if (offsetMinutes !== null) {
    const local = new Date(nowUtc.getTime() + offsetMinutes * 60_000);
    const year = local.getUTCFullYear();
    const month = local.getUTCMonth() + 1;
    const day = local.getUTCDate();
    const hour = local.getUTCHours();
    const minute = local.getUTCMinutes();

    return {
      month,
      day,
      hour,
      minute,
      dateKey: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      localNowLabel: `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      mode: "legacy-offset" as const
    };
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(nowUtc);

  const get = (type: "year" | "month" | "day" | "hour" | "minute") =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = get("hour");
  const minute = get("minute");

  return {
    month,
    day,
    hour,
    minute,
    dateKey: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    localNowLabel: `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    mode: "iana" as const
  };
}
