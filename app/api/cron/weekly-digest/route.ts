import { NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cron/auth";
import { prisma } from "@/server/db/prisma";
import { getNow } from "@/lib/time/getNow";
import { getWeekForSelection } from "@/domain/week";
import { getThisWeekDataForUser } from "@/lib/queries/this-week";
import { sendWeeklyDigestEmail } from "@/lib/email/weeklyDigest";
import { isWeeklyDigestAlreadySent } from "@/lib/email/logs";

export async function GET(request: Request) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  const now = getNow();
  const parishes = await prisma.parish.findMany({
    select: { id: true, name: true }
  });

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const parish of parishes) {
    const week = await getWeekForSelection(parish.id, "current", now);
    const memberships = await prisma.membership.findMany({
      where: {
        parishId: parish.id,
        weeklyDigestEnabled: true
      },
      select: {
        userId: true,
        weeklyDigestEnabled: true,
        user: {
          select: { email: true }
        }
      }
    });

    for (const membership of memberships) {
      if (!membership.user.email) {
        skipped += 1;
        continue;
      }

      const existingLog = await prisma.emailLog.findFirst({
        where: {
          parishId: parish.id,
          weekId: week.id,
          userId: membership.userId,
          type: "DIGEST"
        }
      });

      if (isWeeklyDigestAlreadySent(existingLog)) {
        skipped += 1;
        continue;
      }

      const data = await getThisWeekDataForUser({
        parishId: parish.id,
        userId: membership.userId,
        weekSelection: "current",
        now
      });

      const result = await sendWeeklyDigestEmail({
        parishId: parish.id,
        parishName: parish.name,
        weekId: week.id,
        userId: membership.userId,
        userEmail: membership.user.email,
        weeklyDigestEnabled: membership.weeklyDigestEnabled,
        data
      });

      if (result.status === "SENT") {
        sent += 1;
      } else if (result.status === "FAILED") {
        failed += 1;
      } else {
        skipped += 1;
      }
    }
  }

  return NextResponse.json({ sent, skipped, failed });
}
