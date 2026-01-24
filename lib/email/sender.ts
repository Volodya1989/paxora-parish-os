import { prisma } from "@/server/db/prisma";

type SenderInfo = {
  from: string;
  replyTo?: string;
};

export async function getSenderForParish(parishId?: string | null): Promise<SenderInfo> {
  const defaultFrom = process.env.EMAIL_FROM ?? process.env.EMAIL_FROM_DEFAULT ?? "";
  const defaultReplyTo = process.env.EMAIL_REPLY_TO;

  if (!parishId) {
    return { from: defaultFrom, replyTo: defaultReplyTo };
  }

  const parish = await prisma.parish.findUnique({
    where: { id: parishId },
    select: {
      emailFromName: true,
      emailFromAddress: true,
      emailReplyTo: true,
      emailDomainStatus: true
    }
  });

  if (parish?.emailDomainStatus === "VERIFIED" && parish.emailFromAddress) {
    const fromAddress = parish.emailFromAddress.trim();
    const fromName = parish.emailFromName?.trim();
    const from = fromName ? `${fromName} <${fromAddress}>` : fromAddress;
    return { from, replyTo: parish.emailReplyTo ?? defaultReplyTo };
  }

  return { from: defaultFrom, replyTo: defaultReplyTo };
}
