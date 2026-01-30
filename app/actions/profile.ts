"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";

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
