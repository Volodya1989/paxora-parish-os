"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { normalizeEmail } from "@/lib/validation/auth";
import { issueEmailVerification } from "@/lib/auth/emailVerification";

const signUpSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters")
});

export type SignUpState = {
  error?: string;
  success?: boolean;
};

export async function createUser(
  _prevState: SignUpState,
  formData: FormData
): Promise<SignUpState> {
  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
  }

  const { name, email, password } = parsed.data;
  const normalizedEmail = normalizeEmail(email);

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  });

  if (existingUser) {
    return { error: "An account with this email already exists." };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const createdUser = await prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      passwordHash
    }
  });

  try {
    await issueEmailVerification(createdUser.id);
  } catch (error) {
    console.error("Failed to send verification email", error);
  }

  return { success: true };
}
