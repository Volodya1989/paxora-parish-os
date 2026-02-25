"use server";

import { GreetingType } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { isParishLeader } from "@/lib/permissions";
import { sanitizeGreetingHtml } from "@/lib/sanitize/html";
import {
  getParishLocalDateParts,
  isLegacyUtcOffsetTimezone,
  isValidTimezone,
  parseGreetingLocalTime
} from "@/lib/email/greetingSchedule";
import { getGreetingCandidatesForParish } from "@/lib/email/greetingCandidates";
import { sendGreetingEmailIfEligible } from "@/lib/email/greetings";
import { isMissingColumnError } from "@/lib/prisma/errors";

const greetingTemplateSchema = z.object({
  birthdayGreetingTemplate: z.string().max(5000).optional().default(""),
  anniversaryGreetingTemplate: z.string().max(5000).optional().default(""),
  greetingsSendTimeLocal: z.string().optional().default("09:00")
});

export async function updateParishGreetingTemplates(input: {
  birthdayGreetingTemplate?: string;
  anniversaryGreetingTemplate?: string;
  greetingsSendTimeLocal?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.activeParishId) {
    throw new Error("Unauthorized");
  }

  const membership = await prisma.membership.findUnique({
    where: {
      parishId_userId: {
        parishId: session.user.activeParishId,
        userId: session.user.id
      }
    },
    select: { role: true }
  });

  if (!membership || !isParishLeader(membership.role)) {
    throw new Error("Forbidden");
  }

  const parsed = greetingTemplateSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid template");
  }

  const parsedSendTime = parseGreetingLocalTime(parsed.data.greetingsSendTimeLocal);
  if (!parsedSendTime) {
    throw new Error("Invalid local send time");
  }

  const baseData = {
    birthdayGreetingTemplate: parsed.data.birthdayGreetingTemplate
      ? sanitizeGreetingHtml(parsed.data.birthdayGreetingTemplate)
      : null,
    anniversaryGreetingTemplate: parsed.data.anniversaryGreetingTemplate
      ? sanitizeGreetingHtml(parsed.data.anniversaryGreetingTemplate)
      : null
  };

  let sendTimeSupported = true;

  try {
    await prisma.parish.update({
      where: { id: session.user.activeParishId },
      data: {
        ...baseData,
        greetingsSendHourLocal: parsedSendTime.hour,
        greetingsSendMinuteLocal: parsedSendTime.minute
      }
    });
  } catch (error) {
    if (!isMissingColumnError(error, "Parish.greetingsSendHourLocal")) {
      throw error;
    }

    sendTimeSupported = false;

    await prisma.parish.update({
      where: { id: session.user.activeParishId },
      data: baseData
    });
  }

  revalidatePath("/profile");
  revalidatePath("/admin/automation");

  return {
    status: "success" as const,
    sendTimeSupported
  };
}

const greetingConfigSchema = z.object({
  greetingsEnabled: z.boolean(),
  birthdayGreetingTemplate: z.string().max(5000).optional().default(""),
  anniversaryGreetingTemplate: z.string().max(5000).optional().default(""),
  greetingsSendTimeLocal: z.string().optional().default("09:00"),
  parishTimezone: z.string().trim().min(1).optional().default("UTC")
});

export async function updateParishGreetingConfig(input: {
  greetingsEnabled: boolean;
  birthdayGreetingTemplate?: string;
  anniversaryGreetingTemplate?: string;
  greetingsSendTimeLocal?: string;
  parishTimezone?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.activeParishId) {
    throw new Error("Unauthorized");
  }

  const membership = await prisma.membership.findUnique({
    where: {
      parishId_userId: {
        parishId: session.user.activeParishId,
        userId: session.user.id
      }
    },
    select: { role: true }
  });

  if (!membership || !isParishLeader(membership.role)) {
    throw new Error("Forbidden");
  }

  const parsed = greetingConfigSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid configuration");
  }

  const parsedSendTime = parseGreetingLocalTime(parsed.data.greetingsSendTimeLocal);
  if (!parsedSendTime) {
    throw new Error("Invalid local send time");
  }

  const timezone = parsed.data.parishTimezone;
  if (!isValidTimezone(timezone) && !isLegacyUtcOffsetTimezone(timezone)) {
    throw new Error("Invalid parish timezone");
  }

  const baseData = {
    timezone,
    birthdayGreetingTemplate: parsed.data.birthdayGreetingTemplate
      ? sanitizeGreetingHtml(parsed.data.birthdayGreetingTemplate)
      : null,
    anniversaryGreetingTemplate: parsed.data.anniversaryGreetingTemplate
      ? sanitizeGreetingHtml(parsed.data.anniversaryGreetingTemplate)
      : null
  };

  let greetingsEnabledSupported = true;

  try {
    await prisma.parish.update({
      where: { id: session.user.activeParishId },
      data: {
        ...baseData,
        greetingsEnabled: parsed.data.greetingsEnabled,
        greetingsSendHourLocal: parsedSendTime.hour,
        greetingsSendMinuteLocal: parsedSendTime.minute
      }
    });
  } catch (error) {
    if (isMissingColumnError(error, "Parish.greetingsEnabled")) {
      greetingsEnabledSupported = false;

      try {
        await prisma.parish.update({
          where: { id: session.user.activeParishId },
          data: {
            ...baseData,
            greetingsSendHourLocal: parsedSendTime.hour,
            greetingsSendMinuteLocal: parsedSendTime.minute
          }
        });
      } catch (innerError) {
        if (!isMissingColumnError(innerError, "Parish.greetingsSendHourLocal")) {
          throw innerError;
        }

        await prisma.parish.update({
          where: { id: session.user.activeParishId },
          data: baseData
        });
      }
    } else if (isMissingColumnError(error, "Parish.greetingsSendHourLocal")) {
      await prisma.parish.update({
        where: { id: session.user.activeParishId },
        data: baseData
      });
    } else {
      throw error;
    }
  }

  revalidatePath("/admin/automation");
  revalidatePath("/profile");

  return {
    status: "success" as const,
    greetingsEnabledSupported
  };
}

// ---------------------------------------------------------------------------
// Manual "Send now" action — runs the same logic as the cron handler but is
// triggered directly from the admin Automation page.  This bypasses the Vercel
// cron scheduler entirely, so it works on preview deployments and when the
// cron job has not fired yet.
// ---------------------------------------------------------------------------

export type SendGreetingsNowResult = {
  status: "success" | "error";
  sent: number;
  failed: number;
  skipped: number;
  candidatesFound: number;
  error?: string;
};

export async function sendGreetingsNow(): Promise<SendGreetingsNowResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.activeParishId) {
    return { status: "error", sent: 0, failed: 0, skipped: 0, candidatesFound: 0, error: "Unauthorized" };
  }

  const parishId = session.user.activeParishId;

  const membership = await prisma.membership.findUnique({
    where: { parishId_userId: { parishId, userId: session.user.id } },
    select: { role: true }
  });

  if (!membership || !isParishLeader(membership.role)) {
    return { status: "error", sent: 0, failed: 0, skipped: 0, candidatesFound: 0, error: "Forbidden" };
  }

  // Fetch parish config
  const parish = await prisma.parish.findUnique({
    where: { id: parishId },
    select: {
      name: true,
      timezone: true,
      logoUrl: true,
      birthdayGreetingTemplate: true,
      anniversaryGreetingTemplate: true
    }
  });

  if (!parish) {
    return { status: "error", sent: 0, failed: 0, skipped: 0, candidatesFound: 0, error: "Parish not found" };
  }

  const tz = parish.timezone || "UTC";
  const nowUtc = new Date();
  const { month, day, dateKey } = getParishLocalDateParts(nowUtc, tz);

  const { candidates, summary } = await getGreetingCandidatesForParish({
    prisma,
    parishId,
    month,
    day,
    dateKey
  });

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of candidates) {
    const shouldSendBirthday = row.sendBirthday && !row.alreadySentBirthday;
    const shouldSendAnniversary = row.sendAnniversary && !row.alreadySentAnniversary;

    if (shouldSendBirthday) {
      try {
        const result = await sendGreetingEmailIfEligible({
          parishId,
          parishName: parish.name,
          parishLogoUrl: parish.logoUrl,
          userId: row.userId,
          userEmail: row.email,
          userFirstName: row.firstName,
          greetingType: GreetingType.BIRTHDAY,
          templateHtml: parish.birthdayGreetingTemplate,
          dateKey
        });
        if (result.status === "SENT") sent += 1;
        else if (result.status === "FAILED") failed += 1;
        else skipped += 1;
      } catch {
        failed += 1;
      }
    }

    if (shouldSendAnniversary) {
      try {
        const result = await sendGreetingEmailIfEligible({
          parishId,
          parishName: parish.name,
          parishLogoUrl: parish.logoUrl,
          userId: row.userId,
          userEmail: row.email,
          userFirstName: row.firstName,
          greetingType: GreetingType.ANNIVERSARY,
          templateHtml: parish.anniversaryGreetingTemplate,
          dateKey
        });
        if (result.status === "SENT") sent += 1;
        else if (result.status === "FAILED") failed += 1;
        else skipped += 1;
      } catch {
        failed += 1;
      }
    }
  }

  revalidatePath("/admin/automation");

  return {
    status: "success",
    sent,
    failed,
    skipped,
    candidatesFound: summary.sendableToday
  };
}
