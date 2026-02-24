import { type ParishRole } from "@prisma/client";
import { getServerSession } from "next-auth";
import { prisma } from "@/server/db/prisma";
import { getUserYtdHours } from "@/lib/queries/hours";
import { getMilestoneTier, type MilestoneTier } from "@/lib/hours/milestones";
import { authOptions } from "@/server/auth/options";
import { buildAvatarImagePath } from "@/lib/storage/avatar";

export type CurrentUserProfile = {
  name: string | null;
  email: string;
  birthdayMonth: number | null;
  birthdayDay: number | null;
  anniversaryMonth: number | null;
  anniversaryDay: number | null;
  greetingsOptIn: boolean;
  greetingsOptInAt: Date | null;
  greetingsLastPromptedAt: Date | null;
  greetingsDoNotAskAgain: boolean;
};

export type ProfileSettings = {
  userId: string;
  name: string | null;
  avatarUrl: string | null;
  email: string;
  parishRole: ParishRole | null;
  notificationsEnabled: boolean;
  weeklyDigestEnabled: boolean;
  volunteerHoursOptIn: boolean;
  notifyMessageInApp: boolean;
  notifyTaskInApp: boolean;
  notifyAnnouncementInApp: boolean;
  notifyEventInApp: boolean;
  notifyRequestInApp: boolean;
  notifyMessagePush: boolean;
  notifyTaskPush: boolean;
  notifyAnnouncementPush: boolean;
  notifyEventPush: boolean;
  notifyRequestPush: boolean;
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
        id: true,
        name: true,
        email: true,
        avatarKey: true,
        volunteerHoursOptIn: true,
        notifyMessageInApp: true,
        notifyTaskInApp: true,
        notifyAnnouncementInApp: true,
        notifyEventInApp: true,
        notifyRequestInApp: true,
        notifyMessagePush: true,
        notifyTaskPush: true,
        notifyAnnouncementPush: true,
        notifyEventPush: true,
        notifyRequestPush: true
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
    userId: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarKey ? buildAvatarImagePath(user.avatarKey) : null,
    parishRole: membership?.role ?? null,
    notificationsEnabled: membership?.notifyEmailEnabled ?? true,
    weeklyDigestEnabled: membership?.weeklyDigestEnabled ?? true,
    volunteerHoursOptIn: user.volunteerHoursOptIn,
    notifyMessageInApp: user.notifyMessageInApp,
    notifyTaskInApp: user.notifyTaskInApp,
    notifyAnnouncementInApp: user.notifyAnnouncementInApp,
    notifyEventInApp: user.notifyEventInApp,
    notifyRequestInApp: user.notifyRequestInApp,
    notifyMessagePush: user.notifyMessagePush,
    notifyTaskPush: user.notifyTaskPush,
    notifyAnnouncementPush: user.notifyAnnouncementPush,
    notifyEventPush: user.notifyEventPush,
    notifyRequestPush: user.notifyRequestPush,
    ytdHours,
    milestoneTier,
    ...thresholds
  };

  return profile;
}

export async function getCurrentUserProfile(): Promise<CurrentUserProfile> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      birthdayMonth: true,
      birthdayDay: true,
      anniversaryMonth: true,
      anniversaryDay: true,
      greetingsOptIn: true,
      greetingsOptInAt: true,
      greetingsLastPromptedAt: true,
      greetingsDoNotAskAgain: true
    }
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}
