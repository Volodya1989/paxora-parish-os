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

// Vercel Hobby allows up to 60 s; the default is 10 s which is too short
// for iterating parishes + Resend API calls.
export const maxDuration = 60;

function parseCronPart(value: string | undefined, fallback: number, max: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > max) {
    return fallback;
  }

  return parsed;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function GET(request: Request) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  const jobRunId = crypto.randomUUID().slice(0, 8);
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
  let parishErrors = 0;
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
    jobRunId,
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
      console.warn("[greetings-cron] parish missing timezone; defaulting to UTC", { jobRunId, parishId: parish.id });
    } else if (!isLegacyOffset && !isValidTimezone(parish.timezone)) {
      reasonCounts.invalidTimezone += 1;
      console.error("[greetings-cron] parish has invalid timezone; skipping", {
        jobRunId,
        parishId: parish.id,
        timezone: parish.timezone
      });
      continue;
    }

    // --- Per-parish try/catch: one broken parish must not abort the rest ---
    try {
      const { month, day, dateKey, localNowLabel, mode } = getParishLocalDateParts(nowUtc, tz);

      const configuredSendTime = `${String(parish.greetingsSendHourLocal).padStart(2, "0")}:${String(parish.greetingsSendMinuteLocal).padStart(2, "0")}`;

      const scheduleStatus = getDailyGreetingScheduleStatus({
        nowUtc,
        timezone: tz,
        sendHourLocal: parish.greetingsSendHourLocal,
        sendMinuteLocal: parish.greetingsSendMinuteLocal,
        sentToday: false
      });

      console.info("[greetings-cron] parish evaluation", {
        jobRunId,
        parishId: parish.id,
        timezone: tz,
        timezoneMode: mode,
        localNow: localNowLabel,
        localDate: dateKey,
        configuredSendTime,
        preferredTimeLabel: scheduleStatus.preferredTimeLabel,
        isPastPreferredTime: scheduleStatus.isPastPreferredTime
      });

      matchedParishes += 1;

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
          jobRunId,
          parishId: parish.id,
          timezone: tz,
          localDate: dateKey
        });
        continue;
      }

      console.info("[greetings-cron] candidates resolved", {
        jobRunId,
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
          try {
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
              jobRunId,
              parishId: parish.id,
              userId: row.userId,
              localDate: dateKey,
              status: result.status
            });
          } catch (emailError) {
            failed += 1;
            emailsAttempted += 1;
            console.error("[greetings-cron] birthday greeting threw", {
              jobRunId,
              parishId: parish.id,
              userId: row.userId,
              localDate: dateKey,
              error: errorMessage(emailError)
            });
          }
        }

        if (shouldSendAnniversary) {
          try {
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
              jobRunId,
              parishId: parish.id,
              userId: row.userId,
              localDate: dateKey,
              status: result.status
            });
          } catch (emailError) {
            failed += 1;
            emailsAttempted += 1;
            console.error("[greetings-cron] anniversary greeting threw", {
              jobRunId,
              parishId: parish.id,
              userId: row.userId,
              localDate: dateKey,
              error: errorMessage(emailError)
            });
          }
        }
      }
    } catch (parishError) {
      parishErrors += 1;
      console.error("[greetings-cron] parish processing failed", {
        jobRunId,
        parishId: parish.id,
        error: errorMessage(parishError)
      });
    }
  }

  console.info("[greetings-cron] complete", {
    jobRunId,
    nowUtc: nowUtc.toISOString(),
    sent,
    skipped,
    failed,
    emailsAttempted,
    matchedParishes,
    parishErrors,
    reasonCounts,
    cronScheduleUtc: `${String(cronUtcHour).padStart(2, "0")}:${String(cronUtcMinute).padStart(2, "0")}`
  });

  return NextResponse.json({
    jobRunId,
    sent,
    skipped,
    failed,
    emailsAttempted,
    matchedParishes,
    parishErrors,
    reasonCounts,
    cronScheduleUtc: `${String(cronUtcHour).padStart(2, "0")}:${String(cronUtcMinute).padStart(2, "0")}`
  });
}
