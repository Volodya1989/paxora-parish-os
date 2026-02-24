import { GreetingType } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cron/auth";
import { sendGreetingEmailIfEligible } from "@/lib/email/greetings";
import { getGreetingCandidatesForParish } from "@/lib/email/greetingCandidates";
import {
  getDailyGreetingScheduleStatus,
  getParishLocalDateParts,
  isLegacyUtcOffsetTimezone,
  isValidTimezone
} from "@/lib/email/greetingSchedule";
import { isMissingColumnError } from "@/lib/prisma/errors";
import { prisma } from "@/server/db/prisma";

function parseCronPart(value: string | undefined, fallback: number, max: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > max) {
    return fallback;
  }

  return parsed;
}

export async function GET(request: Request) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  const nowUtc = new Date();
  const cronUtcHour = parseCronPart(process.env.GREETINGS_CRON_UTC_HOUR, 14, 23);
  const cronUtcMinute = parseCronPart(process.env.GREETINGS_CRON_UTC_MINUTE, 0, 59);
  let parishes: Array<{
    id: string;
    name: string;
    timezone: string;
    logoUrl: string | null;
    greetingsEnabled: boolean;
    birthdayGreetingTemplate: string | null;
    anniversaryGreetingTemplate: string | null;
    greetingsSendHourLocal: number;
    greetingsSendMinuteLocal: number;
  }> = [];

  try {
    parishes = await prisma.parish.findMany({
      where: { deactivatedAt: null },
      select: {
        id: true,
        name: true,
        timezone: true,
        logoUrl: true,
        greetingsEnabled: true,
        birthdayGreetingTemplate: true,
        anniversaryGreetingTemplate: true,
        greetingsSendHourLocal: true,
        greetingsSendMinuteLocal: true
      }
    });
  } catch (error) {
    if (isMissingColumnError(error, "Parish.greetingsEnabled")) {
      // greetingsEnabled column not yet migrated — try without it
      try {
        const withoutEnabled = await prisma.parish.findMany({
          where: { deactivatedAt: null },
          select: {
            id: true,
            name: true,
            timezone: true,
            logoUrl: true,
            birthdayGreetingTemplate: true,
            anniversaryGreetingTemplate: true,
            greetingsSendHourLocal: true,
            greetingsSendMinuteLocal: true
          }
        });
        parishes = withoutEnabled.map((p) => ({ ...p, greetingsEnabled: true }));
      } catch (innerError) {
        if (!isMissingColumnError(innerError, "Parish.greetingsSendHourLocal")) {
          throw innerError;
        }
        const minimal = await prisma.parish.findMany({
          where: { deactivatedAt: null },
          select: {
            id: true,
            name: true,
            timezone: true,
            logoUrl: true,
            birthdayGreetingTemplate: true,
            anniversaryGreetingTemplate: true
          }
        });
        parishes = minimal.map((p) => ({
          ...p,
          greetingsEnabled: true,
          greetingsSendHourLocal: 9,
          greetingsSendMinuteLocal: 0
        }));
      }
    } else if (isMissingColumnError(error, "Parish.greetingsSendHourLocal")) {
      const fallbackParishes = await prisma.parish.findMany({
        where: { deactivatedAt: null },
        select: {
          id: true,
          name: true,
          timezone: true,
          logoUrl: true,
          birthdayGreetingTemplate: true,
          anniversaryGreetingTemplate: true
        }
      });
      parishes = fallbackParishes.map((parish) => ({
        ...parish,
        greetingsEnabled: true,
        greetingsSendHourLocal: 9,
        greetingsSendMinuteLocal: 0
      }));
    } else {
      throw error;
    }
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let matchedParishes = 0;
  const reasonCounts = {
    disabled: 0,
    missingTimezone: 0,
    invalidTimezone: 0,
    notSendWindow: 0,
    noCandidates: 0,
    alreadySent: 0
  };

  let emailsAttempted = 0;

  console.info("[greetings-cron] start", {
    nowUtc: nowUtc.toISOString(),
    parishCount: parishes.length,
    cronScheduleUtc: `${String(cronUtcHour).padStart(2, "0")}:${String(cronUtcMinute).padStart(2, "0")}`
  });

  for (const parish of parishes) {
    if (!parish.greetingsEnabled) {
      reasonCounts.disabled += 1;
      continue;
    }

    const tz = parish.timezone || "UTC";
    const isLegacyOffset = isLegacyUtcOffsetTimezone(tz);

    if (!parish.timezone) {
      reasonCounts.missingTimezone += 1;
      console.warn("[greetings-cron] parish missing timezone; defaulting to UTC", { parishId: parish.id });
    } else if (!isLegacyOffset && !isValidTimezone(parish.timezone)) {
      reasonCounts.invalidTimezone += 1;
      console.error("[greetings-cron] parish has invalid timezone; skipping", {
        parishId: parish.id,
        timezone: parish.timezone
      });
      continue;
    }

    const { month, day, hour, minute, dateKey, localNowLabel, mode } = getParishLocalDateParts(nowUtc, tz);

    const configuredSendTime = `${String(parish.greetingsSendHourLocal).padStart(2, "0")}:${String(parish.greetingsSendMinuteLocal).padStart(2, "0")}`;

    const scheduleStatus = getDailyGreetingScheduleStatus({
      nowUtc,
      timezone: tz,
      sendHourLocal: parish.greetingsSendHourLocal,
      sendMinuteLocal: parish.greetingsSendMinuteLocal,
      sentToday: false
    });

    console.info("[greetings-cron] parish evaluation", {
      parishId: parish.id,
      timezone: tz,
      timezoneMode: mode,
      nowUtc: nowUtc.toISOString(),
      localNow: localNowLabel,
      localHHmm: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      configuredSendTime,
      preferredTimeLabel: scheduleStatus.preferredTimeLabel,
      isPastPreferredTime: scheduleStatus.isPastPreferredTime
    });

    matchedParishes += 1;

    console.info("[greetings-cron] parish matched send window", {
      parishId: parish.id,
      timezone: tz,
      timezoneMode: mode,
      localNow: localNowLabel,
      localDate: dateKey,
      sendTime: configuredSendTime
    });

    const { candidates, summary } = await getGreetingCandidatesForParish({
      prisma,
      parishId: parish.id,
      month,
      day,
      dateKey
    });

    if (summary.dateMatchedMemberships === 0) {
      reasonCounts.noCandidates += 1;
      console.info("[greetings-cron] no greeting candidates", {
        parishId: parish.id,
        timezone: tz,
        localDate: dateKey
      });
      continue;
    }

    console.info("[greetings-cron] candidates resolved", {
      parishId: parish.id,
      localDate: dateKey,
      optedInCount: summary.optedInMemberships,
      dateMatchedCount: summary.dateMatchedMemberships,
      missingEmailCount: summary.missingEmailMemberships,
      alreadySentCount: summary.alreadySentToday,
      sendableCount: summary.sendableToday
    });

    for (const row of candidates) {
      const shouldSendBirthday = row.sendBirthday && !row.alreadySentBirthday;
      const shouldSendAnniversary = row.sendAnniversary && !row.alreadySentAnniversary;

      if (shouldSendBirthday) {
        console.info("[greetings-cron] sending birthday greeting", {
          parishId: parish.id,
          userId: row.userId,
          localDate: dateKey
        });
        const result = await sendGreetingEmailIfEligible({
          parishId: parish.id,
          parishName: parish.name,
          parishLogoUrl: parish.logoUrl,
          userId: row.userId,
          userEmail: row.email,
          userFirstName: row.firstName,
          greetingType: GreetingType.BIRTHDAY,
          templateHtml: parish.birthdayGreetingTemplate,
          dateKey
        });
        emailsAttempted += 1;
        if (result.status === "SENT") sent += 1;
        else if (result.status === "FAILED") failed += 1;
        else {
          skipped += 1;
          reasonCounts.alreadySent += 1;
        }
        console.info("[greetings-cron] birthday greeting result", {
          parishId: parish.id,
          userId: row.userId,
          localDate: dateKey,
          status: result.status
        });
      }

      if (shouldSendAnniversary) {
        console.info("[greetings-cron] sending anniversary greeting", {
          parishId: parish.id,
          userId: row.userId,
          localDate: dateKey
        });
        const result = await sendGreetingEmailIfEligible({
          parishId: parish.id,
          parishName: parish.name,
          parishLogoUrl: parish.logoUrl,
          userId: row.userId,
          userEmail: row.email,
          userFirstName: row.firstName,
          greetingType: GreetingType.ANNIVERSARY,
          templateHtml: parish.anniversaryGreetingTemplate,
          dateKey
        });
        emailsAttempted += 1;
        if (result.status === "SENT") sent += 1;
        else if (result.status === "FAILED") failed += 1;
        else {
          skipped += 1;
          reasonCounts.alreadySent += 1;
        }
        console.info("[greetings-cron] anniversary greeting result", {
          parishId: parish.id,
          userId: row.userId,
          localDate: dateKey,
          status: result.status
        });
      }
    }
  }

  console.info("[greetings-cron] complete", {
    nowUtc: nowUtc.toISOString(),
    sent,
    skipped,
    failed,
    emailsAttempted,
    matchedParishes,
    reasonCounts,
    cronScheduleUtc: `${String(cronUtcHour).padStart(2, "0")}:${String(cronUtcMinute).padStart(2, "0")}`
  });

  return NextResponse.json({
    sent,
    skipped,
    failed,
    emailsAttempted,
    matchedParishes,
    reasonCounts,
    cronScheduleUtc: `${String(cronUtcHour).padStart(2, "0")}:${String(cronUtcMinute).padStart(2, "0")}`
  });
}
