import { GreetingType } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cron/auth";
import { sendGreetingEmailIfEligible } from "@/lib/email/greetings";
import { shouldRunGreetingForParishTime } from "@/lib/email/greetingSchedule";
import { isMissingColumnError } from "@/lib/prisma/errors";
import { prisma } from "@/server/db/prisma";

function getParishLocalDateParts(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(now);

  const get = (type: "year" | "month" | "day" | "hour" | "minute") =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = get("hour");
  const minute = get("minute");
  const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return { month, day, hour, minute, dateKey };
}

export async function GET(request: Request) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  const now = new Date();
  let parishes: Array<{
    id: string;
    name: string;
    timezone: string;
    logoUrl: string | null;
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
        birthdayGreetingTemplate: true,
        anniversaryGreetingTemplate: true,
        greetingsSendHourLocal: true,
        greetingsSendMinuteLocal: true
      }
    });
  } catch (error) {
    if (!isMissingColumnError(error, "Parish.greetingsSendHourLocal")) {
      throw error;
    }

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
      greetingsSendHourLocal: 9,
      greetingsSendMinuteLocal: 0
    }));
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const parish of parishes) {
    const { month, day, hour, minute, dateKey } = getParishLocalDateParts(now, parish.timezone || "UTC");

    if (
      !shouldRunGreetingForParishTime({
        nowHour: hour,
        nowMinute: minute,
        sendHourLocal: parish.greetingsSendHourLocal,
        sendMinuteLocal: parish.greetingsSendMinuteLocal
      })
    ) {
      continue;
    }

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
        if (result.status === "SENT") sent += 1;
        else if (result.status === "FAILED") failed += 1;
        else skipped += 1;
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
        if (result.status === "SENT") sent += 1;
        else if (result.status === "FAILED") failed += 1;
        else skipped += 1;
      }
    }
  }

  return NextResponse.json({ sent, skipped, failed });
}
