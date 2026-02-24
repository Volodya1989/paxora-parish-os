import { GreetingType } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cron/auth";
import { sendGreetingEmailIfEligible } from "@/lib/email/greetings";
import { prisma } from "@/server/db/prisma";

export async function GET(request: Request) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  const now = new Date();
  const month = now.getUTCMonth() + 1;
  const day = now.getUTCDate();

  const eligibleUsers = await prisma.membership.findMany({
    where: {
      user: {
        greetingsOptIn: true,
        deletedAt: null,
        OR: [
          { birthdayMonth: month, birthdayDay: day },
          { anniversaryMonth: month, anniversaryDay: day }
        ]
      }
    },
    select: {
      parishId: true,
      userId: true,
      parish: {
        select: {
          name: true,
          logoUrl: true,
          birthdayGreetingTemplate: true,
          anniversaryGreetingTemplate: true
        }
      },
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

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of eligibleUsers) {
    const firstName = row.user.name?.trim().split(" ")[0] || "Friend";
    const email = row.user.email;
    const shouldSendBirthday = row.user.birthdayMonth === month && row.user.birthdayDay === day;
    const shouldSendAnniversary = row.user.anniversaryMonth === month && row.user.anniversaryDay === day;

    if (shouldSendBirthday) {
      const result = await sendGreetingEmailIfEligible({
        parishId: row.parishId,
        parishName: row.parish.name,
        parishLogoUrl: row.parish.logoUrl,
        userId: row.userId,
        userEmail: email,
        userFirstName: firstName,
        greetingType: GreetingType.BIRTHDAY,
        templateHtml: row.parish.birthdayGreetingTemplate,
        now
      });
      if (result.status === "SENT") sent += 1;
      else if (result.status === "FAILED") failed += 1;
      else skipped += 1;
    }

    if (shouldSendAnniversary) {
      const result = await sendGreetingEmailIfEligible({
        parishId: row.parishId,
        parishName: row.parish.name,
        parishLogoUrl: row.parish.logoUrl,
        userId: row.userId,
        userEmail: email,
        userFirstName: firstName,
        greetingType: GreetingType.ANNIVERSARY,
        templateHtml: row.parish.anniversaryGreetingTemplate,
        now
      });
      if (result.status === "SENT") sent += 1;
      else if (result.status === "FAILED") failed += 1;
      else skipped += 1;
    }
  }

  return NextResponse.json({ sent, skipped, failed });
}
