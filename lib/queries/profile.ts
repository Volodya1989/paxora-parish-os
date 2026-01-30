import { type ParishRole } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { getUserYtdHours } from "@/lib/queries/hours";
import { getMilestoneTier, type MilestoneTier } from "@/lib/hours/milestones";

export type ProfileSettings = {
  name: string | null;
  email: string;
  parishRole: ParishRole | null;
  notificationsEnabled: boolean;
  weeklyDigestEnabled: boolean;
  volunteerHoursOptIn: boolean;
  ytdHours: number;
  milestoneTier: MilestoneTier;
  bronzeHours: number;
  silverHours: number;
  goldHours: number;
};

type GetProfileSettingsInput = {
  userId: string;
  parishId?: string | null;
  getNow?: () => Date;
};

export async function getProfileSettings({ userId, parishId, getNow }: GetProfileSettingsInput) {
  const [user, membership, parish] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        volunteerHoursOptIn: true
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
      : Promise.resolve(null),
    parishId
      ? prisma.parish.findUnique({
          where: { id: parishId },
          select: {
            bronzeHours: true,
            silverHours: true,
            goldHours: true
          }
        })
      : Promise.resolve(null)
  ]);

  if (!user) {
    throw new Error("User not found");
  }

  const thresholds = {
    bronzeHours: parish?.bronzeHours ?? 10,
    silverHours: parish?.silverHours ?? 25,
    goldHours: parish?.goldHours ?? 50
  };
  const ytdHours = parishId
    ? await getUserYtdHours({ parishId, userId, getNow })
    : 0;
  const milestoneTier = getMilestoneTier({
    ytdHours,
    ...thresholds
  });

  const profile: ProfileSettings = {
    name: user.name,
    email: user.email,
    parishRole: membership?.role ?? null,
    notificationsEnabled: membership?.notifyEmailEnabled ?? true,
    weeklyDigestEnabled: membership?.weeklyDigestEnabled ?? true,
    volunteerHoursOptIn: user.volunteerHoursOptIn,
    ytdHours,
    milestoneTier,
    ...thresholds
  };

  return profile;
}
