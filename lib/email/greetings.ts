import { EmailType, GreetingType, Prisma } from "@prisma/client";
import { sendEmail } from "@/lib/email/emailService";
import { getAppUrl } from "@/lib/email/utils";
import { renderGreetingEmail } from "@/emails/templates/greetings";
import { prisma } from "@/server/db/prisma";

function todayDateKey(now: Date) {
  return now.toISOString().slice(0, 10);
}


export function isGreetingEmailDuplicateError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function sendGreetingEmailIfEligible(input: {
  parishId: string;
  parishName: string;
  parishLogoUrl: string | null;
  userId: string;
  userEmail: string;
  userFirstName: string;
  greetingType: GreetingType;
  templateHtml: string | null;
  now: Date;
}) {
  const dateKey = todayDateKey(input.now);

  try {
    await prisma.greetingEmailLog.create({
      data: {
        userId: input.userId,
        parishId: input.parishId,
        type: input.greetingType,
        dateKey
      }
    });
  } catch (error) {
    if (isGreetingEmailDuplicateError(error)) {
      return { status: "SKIPPED" as const };
    }
    throw error;
  }

  const content = renderGreetingEmail({
    type: input.greetingType === "BIRTHDAY" ? "birthday" : "anniversary",
    firstName: input.userFirstName,
    parishName: input.parishName,
    templateHtml: input.templateHtml,
    logoUrl: input.parishLogoUrl,
    profileUrl: `${getAppUrl()}/profile`
  });

  const result = await sendEmail({
    type: EmailType.NOTIFICATION,
    template: input.greetingType === "BIRTHDAY" ? "birthdayGreeting" : "anniversaryGreeting",
    toEmail: input.userEmail,
    subject: content.subject,
    html: content.html,
    text: content.text,
    parishId: input.parishId,
    userId: input.userId
  });

  return result;
}
