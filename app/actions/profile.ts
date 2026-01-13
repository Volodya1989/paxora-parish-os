"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";

type UpdateProfileSettingsInput = {
  notificationsEnabled: boolean;
  weeklyDigestEnabled: boolean;
};

export async function updateProfileSettings({
  notificationsEnabled,
  weeklyDigestEnabled
}: UpdateProfileSettingsInput) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  if (typeof notificationsEnabled !== "boolean" || typeof weeklyDigestEnabled !== "boolean") {
    throw new Error("Invalid settings");
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      notificationsEnabled,
      weeklyDigestEnabled
    },
    select: {
      notificationsEnabled: true,
      weeklyDigestEnabled: true
    }
  });

  revalidatePath("/profile");

  return updated;
}
