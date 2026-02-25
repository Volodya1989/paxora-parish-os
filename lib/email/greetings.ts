import { EmailType } from "@prisma/client";
import type { GreetingType } from "@prisma/client";
import { sendEmail } from "@/lib/email/emailService";
import { getAppUrl } from "@/lib/email/utils";
import { renderGreetingEmail } from "@/emails/templates/greetings";
import { prisma } from "@/server/db/prisma";

export function isGreetingEmailDuplicateError(error: unknown) {
  return (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "P2002"
  );
}

export async function sendGreetingEmailIfEligible(
  input: {
    parishId: string;
    parishName: string;
    parishLogoUrl: string | null;
    userId: string;
    userEmail: string;
    userFirstName: string;
    greetingType: GreetingType;
    templateHtml: string | null;
    dateKey: string;
  },
  deps: {
    db?: typeof prisma;
    sendEmailFn?: typeof sendEmail;
  } = {}
) {
  const db = deps.db ?? prisma;
  const sendEmailFn = deps.sendEmailFn ?? sendEmail;

  const existingLog = await db.greetingEmailLog.findUnique({
    where: {
      userId_parishId_type_dateKey: {
        userId: input.userId,
        parishId: input.parishId,
        type: input.greetingType,
        dateKey: input.dateKey
      }
    },
    select: { id: true }
  });

  if (existingLog) {
    return { status: "SKIPPED" as const };
  }

  const content = renderGreetingEmail({
    type: input.greetingType === "BIRTHDAY" ? "birthday" : "anniversary",
    firstName: input.userFirstName,
    parishName: input.parishName,
    templateHtml: input.templateHtml,
    logoUrl: input.parishLogoUrl,
    profileUrl: `${getAppUrl()}/profile`
  });

  const result = await sendEmailFn({
    type: EmailType.NOTIFICATION,
    template: input.greetingType === "BIRTHDAY" ? "birthdayGreeting" : "anniversaryGreeting",
    toEmail: input.userEmail,
    subject: content.subject,
    html: content.html,
    text: content.text,
    parishId: input.parishId,
    userId: input.userId
  });

  if (result.status === "SENT") {
    try {
      await db.greetingEmailLog.create({
        data: {
          userId: input.userId,
          parishId: input.parishId,
          type: input.greetingType,
          dateKey: input.dateKey
        }
      });
    } catch (error) {
      if (!isGreetingEmailDuplicateError(error)) {
        throw error;
      }
    }
  }

  return result;
}
