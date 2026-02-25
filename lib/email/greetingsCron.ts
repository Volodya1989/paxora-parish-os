import { GreetingType, type PrismaClient } from "@prisma/client";
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

export type GreetingsCronSummary = {
  runId: string;
  sent: number;
  skipped: number;
  failed: number;
  emailsAttempted: number;
  matchedParishes: number;
  cronScheduleUtc: string;
  startedAt: string;
  finishedAt: string;
  requestId: string;
  missingEnv: string[];
  reasonCounts: {
    disabled: number;
    missingTimezone: number;
    invalidTimezone: number;
    notSendWindow: number;
    noCandidates: number;
    alreadySent: number;
    parishErrors: number;
    missingEmailConfig: number;
  };
};

function parseCronPart(value: string | undefined, fallback: number, max: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > max) {
    return fallback;
  }

  return parsed;
}

function getMissingEmailEnv() {
  const missing: string[] = [];
  if (!process.env.RESEND_API_KEY) missing.push("RESEND_API_KEY");
  if (!(process.env.EMAIL_FROM || process.env.EMAIL_FROM_DEFAULT)) {
    missing.push("EMAIL_FROM/EMAIL_FROM_DEFAULT");
  }
  return missing;
}

async function loadParishes(db: PrismaClient) {
  try {
    return await db.parish.findMany({
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
      try {
        const withoutEnabled = await db.parish.findMany({
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
        return withoutEnabled.map((p) => ({ ...p, greetingsEnabled: true }));
      } catch (innerError) {
        if (!isMissingColumnError(innerError, "Parish.greetingsSendHourLocal")) {
          throw innerError;
        }
        const minimal = await db.parish.findMany({
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
        return minimal.map((p) => ({
          ...p,
          greetingsEnabled: true,
          greetingsSendHourLocal: 9,
          greetingsSendMinuteLocal: 0
        }));
      }
    }

    if (isMissingColumnError(error, "Parish.greetingsSendHourLocal")) {
      const fallbackParishes = await db.parish.findMany({
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
      return fallbackParishes.map((parish) => ({
        ...parish,
        greetingsEnabled: true,
        greetingsSendHourLocal: 9,
        greetingsSendMinuteLocal: 0
      }));
    }

    throw error;
  }
}

export async function runGreetingsCronJob({
  requestId,
  db = prisma,
  nowUtc = new Date(),
  sendGreetingFn = sendGreetingEmailIfEligible,
  getCandidatesFn = getGreetingCandidatesForParish
}: {
  requestId: string;
  db?: PrismaClient;
  nowUtc?: Date;
  sendGreetingFn?: typeof sendGreetingEmailIfEligible;
  getCandidatesFn?: typeof getGreetingCandidatesForParish;
}): Promise<GreetingsCronSummary> {
  const cronUtcHour = parseCronPart(process.env.GREETINGS_CRON_UTC_HOUR, 14, 23);
  const cronUtcMinute = parseCronPart(process.env.GREETINGS_CRON_UTC_MINUTE, 0, 59);
  const cronScheduleUtc = `${String(cronUtcHour).padStart(2, "0")}:${String(cronUtcMinute).padStart(2, "0")}`;
  const missingEnv = getMissingEmailEnv();

  const runLog = await db.greetingCronRunLog.create({
    data: {
      requestId,
      startedAt: nowUtc,
      status: "RUNNING"
    },
    select: { id: true }
  });

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
    alreadySent: 0,
    parishErrors: 0,
    missingEmailConfig: 0
  };

  let emailsAttempted = 0;

  try {
    const parishes = await loadParishes(db);

    console.info("[greetings-cron] start", {
      requestId,
      runId: runLog.id,
      nowUtc: nowUtc.toISOString(),
      parishCount: parishes.length,
      cronScheduleUtc,
      missingEnv
    });

    for (const parish of parishes) {
      try {
        if (!parish.greetingsEnabled) {
          reasonCounts.disabled += 1;
          continue;
        }

        const tz = parish.timezone || "UTC";
        const isLegacyOffset = isLegacyUtcOffsetTimezone(tz);

        if (!parish.timezone) {
          reasonCounts.missingTimezone += 1;
          console.warn("[greetings-cron] parish missing timezone; defaulting to UTC", {
            requestId,
            runId: runLog.id,
            parishId: parish.id
          });
        } else if (!isLegacyOffset && !isValidTimezone(parish.timezone)) {
          reasonCounts.invalidTimezone += 1;
          console.error("[greetings-cron] parish has invalid timezone; skipping", {
            requestId,
            runId: runLog.id,
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
          requestId,
          runId: runLog.id,
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

        const { candidates, summary } = await getCandidatesFn({
          prisma: db,
          parishId: parish.id,
          month,
          day,
          dateKey
        });

        if (summary.dateMatchedMemberships === 0) {
          reasonCounts.noCandidates += 1;
          continue;
        }

        if (missingEnv.length > 0) {
          reasonCounts.missingEmailConfig += summary.sendableToday;
        }

        console.info("[greetings-cron] candidates resolved", {
          requestId,
          runId: runLog.id,
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

          const sendGreeting = async (greetingType: GreetingType, templateHtml: string | null) => {
            const result = await sendGreetingFn({
              parishId: parish.id,
              parishName: parish.name,
              parishLogoUrl: parish.logoUrl,
              userId: row.userId,
              userEmail: row.email,
              userFirstName: row.firstName,
              greetingType,
              templateHtml,
              dateKey
            });

            emailsAttempted += 1;
            if (result.status === "SENT") {
              sent += 1;
            } else if (result.status === "FAILED") {
              failed += 1;
            } else {
              skipped += 1;
              reasonCounts.alreadySent += 1;
            }

            console.info("[greetings-cron] greeting result", {
              requestId,
              runId: runLog.id,
              parishId: parish.id,
              userId: row.userId,
              localDate: dateKey,
              greetingType,
              status: result.status
            });
          };

          if (shouldSendBirthday) {
            await sendGreeting(GreetingType.BIRTHDAY, parish.birthdayGreetingTemplate);
          }

          if (shouldSendAnniversary) {
            await sendGreeting(GreetingType.ANNIVERSARY, parish.anniversaryGreetingTemplate);
          }
        }
      } catch (parishError) {
        reasonCounts.parishErrors += 1;
        failed += 1;
        console.error("[greetings-cron] parish processing failed", {
          requestId,
          runId: runLog.id,
          parishId: parish.id,
          error: parishError instanceof Error ? parishError.message : String(parishError)
        });
      }
    }

    const finishedAt = new Date();
    await db.greetingCronRunLog.update({
      where: { id: runLog.id },
      data: {
        finishedAt,
        status: "SUCCESS",
        plannedCount: emailsAttempted + skipped,
        sentCount: sent,
        failedCount: failed,
        skippedCount: skipped,
        missingEnv: missingEnv.length > 0 ? missingEnv : undefined
      }
    });

    const summary: GreetingsCronSummary = {
      runId: runLog.id,
      requestId,
      sent,
      skipped,
      failed,
      emailsAttempted,
      matchedParishes,
      reasonCounts,
      cronScheduleUtc,
      startedAt: nowUtc.toISOString(),
      finishedAt: finishedAt.toISOString(),
      missingEnv
    };

    console.info("[greetings-cron] complete", summary);
    return summary;
  } catch (error) {
    const finishedAt = new Date();
    const errorMessage = error instanceof Error ? error.message : String(error);

    await db.greetingCronRunLog.update({
      where: { id: runLog.id },
      data: {
        finishedAt,
        status: "FAILED",
        plannedCount: emailsAttempted + skipped,
        sentCount: sent,
        failedCount: failed + 1,
        skippedCount: skipped,
        errorSummary: errorMessage,
        missingEnv: missingEnv.length > 0 ? missingEnv : undefined
      }
    });

    console.error("[greetings-cron] fatal error", {
      requestId,
      runId: runLog.id,
      error: errorMessage
    });

    throw error;
  }
}
