import { getAppUrl } from "@/lib/email/utils";
import { renderGreetingEmail } from "@/emails/templates/greetings";

type GreetingType = "BIRTHDAY" | "ANNIVERSARY";

type GreetingDb = {
  greetingEmailLog: {
    findUnique: (args: Record<string, unknown>) => Promise<{ id: string } | null>;
    create: (args: Record<string, unknown>) => Promise<unknown>;
  };
};

type SendEmailFn = (input: {
  type: "NOTIFICATION";
  template: "birthdayGreeting" | "anniversaryGreeting";
  toEmail: string;
  subject: string;
  html: string;
  text?: string;
  parishId: string;
  userId: string;
}) => Promise<{ status: "SENT" | "SKIPPED" | "FAILED" }>;

export function isGreetingEmailDuplicateError(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "P2002");
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
    db?: GreetingDb;
    sendEmailFn?: SendEmailFn;
  } = {}
) {
  const db = deps.db ?? (await import("@/server/db/prisma")).prisma;
  const sendEmailFn = deps.sendEmailFn ?? (await import("@/lib/email/emailService")).sendEmail;

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
    type: "NOTIFICATION",
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
