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

const LEGACY_UTC_OFFSET_REGEX = /^UTC[+-]\d{1,2}(?::?\d{2})?$/i;

export type ParishTimezoneOption = {
  value: string;
  label: string;
};

export function isLegacyUtcOffsetTimezone(timezone: string) {
  return LEGACY_UTC_OFFSET_REGEX.test(timezone.trim());
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
