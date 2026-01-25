"use server";

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { normalizeEmail } from "@/lib/validation/auth";
import { sendResetPasswordEmail } from "@/lib/email/passwordReset";

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

type PasswordResetRequestState = {
  success?: boolean;
  error?: string;
};

type PasswordResetState = {
  success?: boolean;
  error?: string;
};

const requestSchema = z.object({
  email: z.string().email("Enter a valid email address")
});

const resetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters")
});

export async function requestPasswordReset(
  _prevState: PasswordResetRequestState,
  formData: FormData
): Promise<PasswordResetRequestState> {
  const parsed = requestSchema.safeParse({
    email: formData.get("email")
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid email" };
  }

  const normalizedEmail = normalizeEmail(parsed.data.email);
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, email: true, name: true }
  });

  if (!user) {
    return { success: true };
  }

  const existing = await prisma.passwordResetToken.findFirst({
    where: {
      userId: user.id,
      usedAt: null,
      expiresAt: {
        gt: new Date()
      }
    },
    orderBy: { createdAt: "desc" }
  });

  if (existing) {
    return { success: true };
  }

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt
    }
  });

  try {
    await sendResetPasswordEmail({
      userId: user.id,
      email: user.email,
      name: user.name,
      token
    });
  } catch (error) {
    console.error("Failed to send reset password email", error);
  }

  return { success: true };
}

export async function resetPassword(
  _prevState: PasswordResetState,
  formData: FormData
): Promise<PasswordResetState> {
  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password")
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  const tokenHash = crypto.createHash("sha256").update(parsed.data.token).digest("hex");
  const tokenRecord = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      usedAt: true
    }
  });

  if (!tokenRecord || tokenRecord.usedAt || tokenRecord.expiresAt < new Date()) {
    return { error: "This reset link is invalid or expired." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: tokenRecord.userId },
      data: { passwordHash }
    }),
    prisma.passwordResetToken.update({
      where: { id: tokenRecord.id },
      data: { usedAt: new Date() }
    }),
    prisma.passwordResetToken.deleteMany({
      where: {
        userId: tokenRecord.userId,
        usedAt: null,
        id: { not: tokenRecord.id }
      }
    })
  ]);

  return { success: true };
}
