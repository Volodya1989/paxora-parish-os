"use server";

import crypto from "node:crypto";
import { prisma } from "@/server/db/prisma";
import { sendVerificationEmail } from "@/lib/email/verification";

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

type VerificationResult =
  | { status: "sent" }
  | { status: "already_verified" }
  | { status: "missing_user" };

export async function issueEmailVerification(userId: string): Promise<VerificationResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, emailVerifiedAt: true }
  });

  if (!user) {
    return { status: "missing_user" };
  }

  if (user.emailVerifiedAt) {
    return { status: "already_verified" };
  }

  await prisma.emailVerificationToken.deleteMany({
    where: {
      userId: user.id,
      usedAt: null
    }
  });

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);

  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt
    }
  });

  await sendVerificationEmail({
    userId: user.id,
    email: user.email,
    name: user.name,
    token
  });

  return { status: "sent" };
}

export async function verifyEmailToken(token: string) {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, usedAt: true, expiresAt: true }
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { success: false };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() }
    }),
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() }
    }),
    prisma.emailVerificationToken.deleteMany({
      where: {
        userId: record.userId,
        usedAt: null,
        id: { not: record.id }
      }
    })
  ]);

  return { success: true };
}
