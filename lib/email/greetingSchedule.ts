export const GREETING_MINUTE_INTERVAL = 15;

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
