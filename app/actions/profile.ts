"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { profileDatesSchema, type ProfileDatesInput } from "@/lib/validation/profile";
import { isMissingColumnError } from "@/lib/prisma/errors";

type UpdateProfileSettingsInput = {
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
};

export async function updateProfileSettings({
  notificationsEnabled,
  weeklyDigestEnabled,
  volunteerHoursOptIn,
  notifyMessageInApp,
  notifyTaskInApp,
  notifyAnnouncementInApp,
  notifyEventInApp,
  notifyRequestInApp,
  notifyMessagePush,
  notifyTaskPush,
  notifyAnnouncementPush,
  notifyEventPush,
  notifyRequestPush
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
    typeof volunteerHoursOptIn !== "boolean" ||
    typeof notifyMessageInApp !== "boolean" ||
    typeof notifyTaskInApp !== "boolean" ||
    typeof notifyAnnouncementInApp !== "boolean" ||
    typeof notifyEventInApp !== "boolean" ||
    typeof notifyRequestInApp !== "boolean" ||
    typeof notifyMessagePush !== "boolean" ||
    typeof notifyTaskPush !== "boolean" ||
    typeof notifyAnnouncementPush !== "boolean" ||
    typeof notifyEventPush !== "boolean" ||
    typeof notifyRequestPush !== "boolean"
  ) {
    throw new Error("Invalid settings");
  }

  const [updatedUser, updatedMembership] = await Promise.all([
    prisma.user.update({
      where: { id: session.user.id },
      data: {
        volunteerHoursOptIn,
        notifyMessageInApp,
        notifyTaskInApp,
        notifyAnnouncementInApp,
        notifyEventInApp,
        notifyRequestInApp,
        notifyMessagePush,
        notifyTaskPush,
        notifyAnnouncementPush,
        notifyEventPush,
        notifyRequestPush
      },
      select: {
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
    volunteerHoursOptIn: updatedUser.volunteerHoursOptIn,
    notifyMessageInApp: updatedUser.notifyMessageInApp,
    notifyTaskInApp: updatedUser.notifyTaskInApp,
    notifyAnnouncementInApp: updatedUser.notifyAnnouncementInApp,
    notifyEventInApp: updatedUser.notifyEventInApp,
    notifyRequestInApp: updatedUser.notifyRequestInApp,
    notifyMessagePush: updatedUser.notifyMessagePush,
    notifyTaskPush: updatedUser.notifyTaskPush,
    notifyAnnouncementPush: updatedUser.notifyAnnouncementPush,
    notifyEventPush: updatedUser.notifyEventPush,
    notifyRequestPush: updatedUser.notifyRequestPush
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
      anniversaryDay: true
    }
  });

  if (session.user.activeParishId) {
    await prisma.membership.update({
      where: {
        parishId_userId: {
          parishId: session.user.activeParishId,
          userId: session.user.id
        }
      },
      data: { greetingsLastPromptedAt: new Date() }
    }).catch(() => null);
  }

  revalidatePath("/profile");

  return {
    status: "success",
    data: updatedUser
  };
}

export async function markGreetingsPromptNotNow() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  if (!session.user.activeParishId) {
    throw new Error("Missing active parish");
  }

  try {
    await prisma.membership.update({
      where: {
        parishId_userId: {
          parishId: session.user.activeParishId,
          userId: session.user.id
        }
      },
      data: { greetingsLastPromptedAt: new Date() }
    });
  } catch (error) {
    if (!isMissingColumnError(error, "Membership.greetingsLastPromptedAt")) {
      throw error;
    }

    await prisma.user
      .update({
        where: { id: session.user.id },
        data: { greetingsLastPromptedAt: new Date() }
      })
      .catch(() => null);
  }
  revalidatePath("/profile");
}

export async function markGreetingsPromptDoNotAskAgain() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  if (!session.user.activeParishId) {
    throw new Error("Missing active parish");
  }

  try {
    await prisma.membership.update({
      where: {
        parishId_userId: {
          parishId: session.user.activeParishId,
          userId: session.user.id
        }
      },
      data: {
        greetingsDoNotAskAgain: true,
        greetingsLastPromptedAt: new Date()
      }
    });
  } catch (error) {
    if (!isMissingColumnError(error, "Membership.greetingsDoNotAskAgain")) {
      throw error;
    }

    await prisma.user
      .update({
        where: { id: session.user.id },
        data: {
          greetingsDoNotAskAgain: true,
          greetingsLastPromptedAt: new Date()
        }
      })
      .catch(() => null);
  }
  revalidatePath("/profile");
}

export async function updateAllowParishGreetings(allowParishGreetings: boolean) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  if (typeof allowParishGreetings !== "boolean") {
    throw new Error("Invalid value");
  }

  if (!session.user.activeParishId) {
    throw new Error("Missing active parish");
  }

  try {
    await prisma.membership.update({
      where: {
        parishId_userId: {
          parishId: session.user.activeParishId,
          userId: session.user.id
        }
      },
      data: {
        allowParishGreetings,
        greetingsOptInAt: allowParishGreetings ? new Date() : null,
        greetingsLastPromptedAt: new Date()
      }
    });
  } catch (error) {
    if (!isMissingColumnError(error, "Membership.allowParishGreetings")) {
      throw error;
    }

    await prisma.user
      .update({
        where: { id: session.user.id },
        data: {
          greetingsOptIn: allowParishGreetings,
          greetingsOptInAt: allowParishGreetings ? new Date() : null,
          greetingsLastPromptedAt: new Date()
        }
      })
      .catch(() => null);
  }
  revalidatePath("/profile");
}
