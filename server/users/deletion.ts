import bcrypt from "bcryptjs";
import { prisma } from "@/server/db/prisma";

export async function softDeleteUserAccount(userId: string) {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      deletedAt: true
    }
  });

  if (!existing) {
    return { status: "not_found" as const };
  }

  if (existing.deletedAt) {
    return { status: "already_deleted" as const };
  }

  const deletionToken = `deleted-${existing.id}-${Date.now()}`;
  const replacementHash = await bcrypt.hash(deletionToken, 10);
  const replacementEmail = `${deletionToken}@deleted.local`;

  await prisma.$transaction(async (tx) => {
    await tx.membership.deleteMany({ where: { userId } });
    await tx.groupMembership.deleteMany({ where: { userId } });
    await tx.chatChannelMembership.deleteMany({ where: { userId } });
    await tx.chatRoomReadState.deleteMany({ where: { userId } });
    await tx.pushSubscription.deleteMany({ where: { userId } });
    await tx.account.deleteMany({ where: { userId } });
    await tx.session.deleteMany({ where: { userId } });
    await tx.passwordResetToken.deleteMany({ where: { userId } });
    await tx.emailVerificationToken.deleteMany({ where: { userId } });
    await tx.accessRequest.deleteMany({ where: { userId } });

    await tx.user.update({
      where: { id: userId },
      data: {
        name: "Deleted User",
        email: replacementEmail,
        passwordHash: replacementHash,
        avatarKey: null,
        activeParishId: null,
        impersonatedParishId: null,
        deletedAt: new Date(),
        platformRole: null,
        notificationsEnabled: false,
        weeklyDigestEnabled: false,
        notifyMessageInApp: false,
        notifyTaskInApp: false,
        notifyAnnouncementInApp: false,
        notifyEventInApp: false,
        notifyRequestInApp: false,
        notifyMessagePush: false,
        notifyTaskPush: false,
        notifyAnnouncementPush: false,
        notifyEventPush: false,
        notifyRequestPush: false,
        volunteerHoursOptIn: false,
        greetingsOptIn: false,
        greetingsOptInAt: null,
        greetingsLastPromptedAt: null,
        greetingsDoNotAskAgain: false,
        birthdayMonth: null,
        birthdayDay: null,
        anniversaryMonth: null,
        anniversaryDay: null,
        emailVerifiedAt: null
      }
    });
  });

  return { status: "deleted" as const };
}
