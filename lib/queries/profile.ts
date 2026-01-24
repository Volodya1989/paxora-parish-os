import { type ParishRole } from "@prisma/client";
import { prisma } from "@/server/db/prisma";

export type ProfileSettings = {
  name: string | null;
  email: string;
  parishRole: ParishRole | null;
  notificationsEnabled: boolean;
  weeklyDigestEnabled: boolean;
};

type GetProfileSettingsInput = {
  userId: string;
  parishId?: string | null;
};

export async function getProfileSettings({ userId, parishId }: GetProfileSettingsInput) {
  const [user, membership] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true
      }
    }),
    parishId
      ? prisma.membership.findUnique({
          where: {
            parishId_userId: {
              parishId,
              userId
            }
          },
          select: {
            role: true,
            notifyEmailEnabled: true,
            weeklyDigestEnabled: true
          }
        })
      : Promise.resolve(null)
  ]);

  if (!user) {
    throw new Error("User not found");
  }

  const profile: ProfileSettings = {
    name: user.name,
    email: user.email,
    parishRole: membership?.role ?? null,
    notificationsEnabled: membership?.notifyEmailEnabled ?? true,
    weeklyDigestEnabled: membership?.weeklyDigestEnabled ?? true
  };

  return profile;
}
