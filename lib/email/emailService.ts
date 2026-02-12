import type { EmailLog } from "@prisma/client";
import { EmailStatus, EmailType } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { sendResendEmail } from "@/lib/email/providers/resend";
import { getSenderForParish } from "@/lib/email/sender";
import { shouldSendEmail, type MembershipEmailPreferences } from "@/lib/email/rules";
import { recordDeliveryAttempt, toDeliveryTarget } from "@/lib/ops/deliveryAttempts";

type EmailContent = {
  subject: string;
  html: string;
  text?: string;
};

type EmailMetadata = {
  type: EmailType;
  template: string;
  toEmail: string;
  userId?: string | null;
  parishId?: string | null;
  weekId?: string | null;
  joinRequestId?: string | null;
  announcementId?: string | null;
};

type EmailSendInput = EmailMetadata &
  EmailContent & {
    replyTo?: string;
    dedupeLog?: {
      joinRequestId?: string | null;
      parishId?: string | null;
      weekId?: string | null;
      userId?: string | null;
      toEmail?: string | null;
      type: EmailType;
    };
  };

type EmailSendResult = {
  status: "SENT" | "SKIPPED" | "FAILED";
  log?: EmailLog;
};

function getDefaultSenderError() {
  return "Missing EMAIL_FROM or EMAIL_FROM_DEFAULT";
}

async function findExistingLog(dedupeLog?: EmailSendInput["dedupeLog"]) {
  if (!dedupeLog) {
    return null;
  }

  return prisma.emailLog.findFirst({
    where: {
      type: dedupeLog.type,
      joinRequestId: dedupeLog.joinRequestId ?? undefined,
      parishId: dedupeLog.parishId ?? undefined,
      weekId: dedupeLog.weekId ?? undefined,
      userId: dedupeLog.userId ?? undefined,
      toEmail: dedupeLog.toEmail ?? undefined
    }
  });
}

async function upsertEmailLog({
  existing,
  data
}: {
  existing: EmailLog | null;
  data: EmailMetadata & { status: EmailStatus; error?: string | null; sentAt?: Date | null };
}) {
  if (existing) {
    return prisma.emailLog.update({
      where: { id: existing.id },
      data: {
        status: data.status,
        error: data.error ?? null,
        sentAt: data.sentAt ?? null
      }
    });
  }

  return prisma.emailLog.create({ data });
}

export async function sendEmail(input: EmailSendInput): Promise<EmailSendResult> {
  const existing = await findExistingLog(input.dedupeLog);

  if (existing?.status === "SENT") {
    return { status: "SKIPPED", log: existing };
  }

  const sender = await getSenderForParish(input.parishId ?? input.dedupeLog?.parishId ?? null);
  if (!sender.from) {
    const log = await upsertEmailLog({
      existing,
      data: {
        type: input.type,
        template: input.template,
        toEmail: input.toEmail,
        userId: input.userId ?? null,
        parishId: input.parishId ?? null,
        weekId: input.weekId ?? null,
        joinRequestId: input.joinRequestId ?? null,
        announcementId: input.announcementId ?? null,
        status: "FAILED",
        sentAt: null,
        error: getDefaultSenderError()
      }
    });
    await recordDeliveryAttempt({
      channel: "EMAIL",
      status: "FAILURE",
      parishId: input.parishId ?? null,
      userId: input.userId ?? null,
      target: toDeliveryTarget("EMAIL", input.toEmail),
      template: input.template,
      context: { type: input.type },
      errorMessage: getDefaultSenderError()
    });
    return { status: "FAILED", log };
  }

  try {
    await sendResendEmail({
      from: sender.from,
      to: input.toEmail,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo ?? sender.replyTo
    });

    const log = await upsertEmailLog({
      existing,
      data: {
        type: input.type,
        template: input.template,
        toEmail: input.toEmail,
        userId: input.userId ?? null,
        parishId: input.parishId ?? null,
        weekId: input.weekId ?? null,
        joinRequestId: input.joinRequestId ?? null,
        announcementId: input.announcementId ?? null,
        status: "SENT",
        sentAt: new Date(),
        error: null
      }
    });

    await recordDeliveryAttempt({
      channel: "EMAIL",
      status: "SUCCESS",
      parishId: input.parishId ?? null,
      userId: input.userId ?? null,
      target: toDeliveryTarget("EMAIL", input.toEmail),
      template: input.template,
      context: { type: input.type }
    });

    return { status: "SENT", log };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email error";
    const log = await upsertEmailLog({
      existing,
      data: {
        type: input.type,
        template: input.template,
        toEmail: input.toEmail,
        userId: input.userId ?? null,
        parishId: input.parishId ?? null,
        weekId: input.weekId ?? null,
        joinRequestId: input.joinRequestId ?? null,
        announcementId: input.announcementId ?? null,
        status: "FAILED",
        sentAt: null,
        error: message
      }
    });

    await recordDeliveryAttempt({
      channel: "EMAIL",
      status: "FAILURE",
      parishId: input.parishId ?? null,
      userId: input.userId ?? null,
      target: toDeliveryTarget("EMAIL", input.toEmail),
      template: input.template,
      context: { type: input.type },
      errorMessage: message
    });

    return { status: "FAILED", log };
  }
}

export async function sendEmailIfAllowed({
  prefs,
  ...input
}: EmailSendInput & { prefs?: MembershipEmailPreferences | null }): Promise<EmailSendResult> {
  if (!shouldSendEmail(input.type, prefs)) {
    return { status: "SKIPPED" };
  }

  return sendEmail(input);
}
