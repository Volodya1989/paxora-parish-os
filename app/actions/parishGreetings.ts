"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { isParishLeader } from "@/lib/permissions";
import { sanitizeGreetingHtml } from "@/lib/sanitize/html";
import { isMissingColumnError } from "@/lib/prisma/errors";

const greetingTemplateSchema = z.object({
  birthdayGreetingTemplate: z.string().max(5000).optional().default(""),
  anniversaryGreetingTemplate: z.string().max(5000).optional().default(""),
  greetingsSendHourLocal: z.number().int().min(0).max(23).optional().default(9)
});

export async function updateParishGreetingTemplates(input: {
  birthdayGreetingTemplate?: string;
  anniversaryGreetingTemplate?: string;
  greetingsSendHourLocal?: number;
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

  try {
    await prisma.parish.update({
      where: { id: session.user.activeParishId },
      data: {
        birthdayGreetingTemplate: parsed.data.birthdayGreetingTemplate
          ? sanitizeGreetingHtml(parsed.data.birthdayGreetingTemplate)
          : null,
        anniversaryGreetingTemplate: parsed.data.anniversaryGreetingTemplate
          ? sanitizeGreetingHtml(parsed.data.anniversaryGreetingTemplate)
          : null,
        greetingsSendHourLocal: parsed.data.greetingsSendHourLocal
      }
    });
  } catch (error) {
    if (!isMissingColumnError(error, "Parish.greetingsSendHourLocal")) {
      throw error;
    }

    await prisma.parish.update({
      where: { id: session.user.activeParishId },
      data: {
        birthdayGreetingTemplate: parsed.data.birthdayGreetingTemplate
          ? sanitizeGreetingHtml(parsed.data.birthdayGreetingTemplate)
          : null,
        anniversaryGreetingTemplate: parsed.data.anniversaryGreetingTemplate
          ? sanitizeGreetingHtml(parsed.data.anniversaryGreetingTemplate)
          : null
      }
    });
  }

  revalidatePath("/profile");
}
