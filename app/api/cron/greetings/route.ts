import { GreetingType } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cron/auth";
import { sendGreetingEmailIfEligible } from "@/lib/email/greetings";
import {
  getParishLocalDateParts,
  isLegacyUtcOffsetTimezone,
  isValidTimezone,
  shouldRunGreetingForParishTime
} from "@/lib/email/greetingSchedule";
import { isMissingColumnError } from "@/lib/prisma/errors";
import { prisma } from "@/server/db/prisma";

export async function GET(request: Request) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  const nowUtc = new Date();
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
    parishCount: parishes.length
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

    if (
      !shouldRunGreetingForParishTime({
        nowHour: hour,
        nowMinute: minute,
        sendHourLocal: parish.greetingsSendHourLocal,
        sendMinuteLocal: parish.greetingsSendMinuteLocal
      })
    ) {
      reasonCounts.notSendWindow += 1;
      continue;
    }

    matchedParishes += 1;

    console.info("[greetings-cron] parish matched send window", {
      parishId: parish.id,
      timezone: tz,
      timezoneMode: mode,
      localNow: localNowLabel,
      localDate: dateKey,
      sendTime: `${String(parish.greetingsSendHourLocal).padStart(2, "0")}:${String(parish.greetingsSendMinuteLocal).padStart(2, "0")}`
    });

    let memberships: Array<{
      userId: string;
      user: {
        email: string;
        name: string | null;
        birthdayMonth: number | null;
        birthdayDay: number | null;
        anniversaryMonth: number | null;
        anniversaryDay: number | null;
      };
    }> = [];

    try {
      memberships = await prisma.membership.findMany({
        where: {
          parishId: parish.id,
          allowParishGreetings: true,
          user: {
            deletedAt: null,
            OR: [
              { birthdayMonth: month, birthdayDay: day },
              { anniversaryMonth: month, anniversaryDay: day }
            ]
          }
        },
        select: {
          userId: true,
          user: {
            select: {
              email: true,
              name: true,
              birthdayMonth: true,
              birthdayDay: true,
              anniversaryMonth: true,
              anniversaryDay: true
            }
          }
        }
      });
    } catch (error) {
      if (!isMissingColumnError(error, "Membership.allowParishGreetings")) {
        throw error;
      }

      memberships = await prisma.membership.findMany({
        where: {
          parishId: parish.id,
          user: {
            deletedAt: null,
            greetingsOptIn: true,
            OR: [
              { birthdayMonth: month, birthdayDay: day },
              { anniversaryMonth: month, anniversaryDay: day }
            ]
          }
        },
        select: {
          userId: true,
          user: {
            select: {
              email: true,
              name: true,
              birthdayMonth: true,
              birthdayDay: true,
              anniversaryMonth: true,
              anniversaryDay: true
            }
          }
        }
      });
    }

    if (memberships.length === 0) {
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
      candidates: memberships.length,
      localDate: dateKey
    });

    for (const row of memberships) {
      const firstName = row.user.name?.trim().split(" ")[0] || "Friend";
      const email = row.user.email;
      const shouldSendBirthday = row.user.birthdayMonth === month && row.user.birthdayDay === day;
      const shouldSendAnniversary = row.user.anniversaryMonth === month && row.user.anniversaryDay === day;

      if (shouldSendBirthday) {
        const result = await sendGreetingEmailIfEligible({
          parishId: parish.id,
          parishName: parish.name,
          parishLogoUrl: parish.logoUrl,
          userId: row.userId,
          userEmail: email,
          userFirstName: firstName,
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
      }

      if (shouldSendAnniversary) {
        const result = await sendGreetingEmailIfEligible({
          parishId: parish.id,
          parishName: parish.name,
          parishLogoUrl: parish.logoUrl,
          userId: row.userId,
          userEmail: email,
          userFirstName: firstName,
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
    reasonCounts
  });

  return NextResponse.json({ sent, skipped, failed, emailsAttempted, matchedParishes, reasonCounts });
}
