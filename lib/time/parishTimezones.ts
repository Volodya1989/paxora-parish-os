const FRIENDLY_TIMEZONE_LABELS: Record<string, string> = {
  "America/New_York": "Eastern Time",
  "America/Chicago": "Central Time",
  "America/Denver": "Mountain Time",
  "America/Los_Angeles": "Pacific Time",
  "America/Phoenix": "Arizona Time",
  "America/Anchorage": "Alaska Time",
  "Pacific/Honolulu": "Hawaii Time"
};

const PRIORITY_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "UTC"
];

const LEGACY_UTC_OFFSET_REGEX = /^UTC([+-])(\d{1,2})(?::?(\d{2}))?$/i;

export type ParishTimezoneOption = {
  value: string;
  label: string;
};

export function isLegacyUtcOffsetTimezone(timezone: string) {
  return LEGACY_UTC_OFFSET_REGEX.test(timezone.trim());
}

function parseLegacyUtcOffsetMinutes(timezone: string) {
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

function getLocalHourMinute(now: Date, timezone: string) {
  const legacyOffsetMinutes = parseLegacyUtcOffsetMinutes(timezone);
  if (legacyOffsetMinutes !== null) {
    const local = new Date(now.getTime() + legacyOffsetMinutes * 60_000);
    return {
      hour: local.getUTCHours(),
      minute: local.getUTCMinutes()
    };
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(now);

  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");

  return { hour, minute };
}

function formatHourMinute12h(hour: number, minute: number) {
  const meridiem = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${meridiem}`;
}

export function getNextRunPreview(timezone: string, sendTime: string, now = new Date()) {
  const parsed = /^(\d{2}):(\d{2})$/.exec(sendTime.trim());
  if (!parsed) {
    return null;
  }

  const targetHour = Number(parsed[1]);
  const targetMinute = Number(parsed[2]);
  if (targetHour > 23 || targetMinute > 59) {
    return null;
  }

  try {
    const { hour, minute } = getLocalHourMinute(now, timezone);
    const nowTotal = hour * 60 + minute;
    const sendTotal = targetHour * 60 + targetMinute;
    const dayLabel = nowTotal <= sendTotal ? "Today" : "Tomorrow";

    return `${dayLabel} at ${formatHourMinute12h(targetHour, targetMinute)}`;
  } catch {
    return null;
  }
}

export function formatTimezoneLabel(timezone: string) {
  const friendly = FRIENDLY_TIMEZONE_LABELS[timezone];
  return friendly ? `${timezone} (${friendly})` : timezone;
}

export function buildParishTimezoneOptions(): ParishTimezoneOption[] {
  const allTimezones = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
  const merged = [...new Set([...PRIORITY_TIMEZONES, ...allTimezones])];

  return merged.map((tz) => ({
    value: tz,
    label: formatTimezoneLabel(tz)
  }));
}

export function formatCurrentTimeInTimezone(timezone: string, now = new Date()) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      minute: "2-digit"
    }).format(now);
  } catch {
    return null;
  }
}
