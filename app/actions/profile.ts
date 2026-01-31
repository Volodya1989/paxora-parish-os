"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { profileDatesSchema, type ProfileDatesInput } from "@/lib/validation/profile";

type UpdateProfileSettingsInput = {
  notificationsEnabled: boolean;
  weeklyDigestEnabled: boolean;
  volunteerHoursOptIn: boolean;
};

export async function updateProfileSettings({
  notificationsEnabled,
  weeklyDigestEnabled,
  volunteerHoursOptIn
}: UpdateProfileSettingsInput) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const parishId = session.user.activeParishId;
  if (!parishId) {
    throw new Error("Missing active parish");
  }

  if (
    typeof notificationsEnabled !== "boolean" ||
    typeof weeklyDigestEnabled !== "boolean" ||
    typeof volunteerHoursOptIn !== "boolean"
  ) {
    throw new Error("Invalid settings");
  }

  const [, updatedMembership] = await Promise.all([
    prisma.user.update({
      where: { id: session.user.id },
      data: { volunteerHoursOptIn },
      select: { volunteerHoursOptIn: true }
    }),
    prisma.membership.upsert({
      where: {
        parishId_userId: {
          parishId,
          userId: session.user.id
        }
      },
      update: {
        notifyEmailEnabled: notificationsEnabled,
        weeklyDigestEnabled
      },
      create: {
        parishId,
        userId: session.user.id,
        notifyEmailEnabled: notificationsEnabled,
        weeklyDigestEnabled
      },
      select: {
        notifyEmailEnabled: true,
        weeklyDigestEnabled: true
      }
    })
  ]);

  revalidatePath("/profile");

  return {
    notificationsEnabled: updatedMembership.notifyEmailEnabled,
    weeklyDigestEnabled: updatedMembership.weeklyDigestEnabled,
    volunteerHoursOptIn
  };
}

type UpdateProfileDatesResult =
  | { status: "success"; data: ProfileDatesInput }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

export async function updateProfileDates(
  input: ProfileDatesInput
): Promise<UpdateProfileDatesResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const parsed = profileDatesSchema.safeParse(input);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors
    };
  }

  const updatedUser = await prisma.user.update({
    where: { id: session.user.id },
    data: parsed.data,
    select: {
      birthdayMonth: true,
      birthdayDay: true,
      anniversaryMonth: true,
      anniversaryDay: true,
      greetingsOptIn: true
    }
  });

  revalidatePath("/profile");

  return {
    status: "success",
    data: updatedUser
  };
}
