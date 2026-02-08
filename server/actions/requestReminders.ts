"use server";

import { prisma } from "@/server/db/prisma";
import type { ParishRole } from "@prisma/client";
import { getNow } from "@/lib/time/getNow";
import {
  REQUEST_OVERDUE_STALE_DAYS,
  REQUEST_OVERDUE_SUBMITTED_HOURS,
  getRequestTypeLabel
} from "@/lib/requests/utils";
import { sendRequestReminderEmail } from "@/lib/email/requestNotifications";
import { notifyRequestReminder } from "@/lib/push/notify";

const REMINDER_COOLDOWN_HOURS = 24;

type ReminderRecipient = {
  userId: string;
  email: string;
  name: string | null;
  notifyEmailEnabled: boolean;
  role: "ADMIN" | "SHEPHERD" | "MEMBER";
};

export async function sendRequestOverdueReminders() {
  const now = getNow();
  const submittedCutoff = new Date(now.getTime() - REQUEST_OVERDUE_SUBMITTED_HOURS * 60 * 60 * 1000);
  const staleCutoff = new Date(now.getTime() - REQUEST_OVERDUE_STALE_DAYS * 24 * 60 * 60 * 1000);
  const reminderCutoff = new Date(now.getTime() - REMINDER_COOLDOWN_HOURS * 60 * 60 * 1000);

  const requests = await prisma.request.findMany({
    where: {
      AND: [
        {
          OR: [
            { status: "SUBMITTED", createdAt: { lt: submittedCutoff } },
            { status: { in: ["ACKNOWLEDGED", "SCHEDULED"] }, updatedAt: { lt: staleCutoff } }
          ]
        },
        {
          OR: [{ lastReminderAt: null }, { lastReminderAt: { lt: reminderCutoff } }]
        }
      ]
    },
    select: {
      id: true,
      parishId: true,
      title: true,
      type: true,
      status: true,
      visibilityScope: true,
      assignedToUserId: true,
      lastReminderAt: true,
      parish: {
        select: {
          name: true
        }
      }
    }
  });

  const leaderCache = new Map<string, ReminderRecipient[]>();

  const loadLeaders = async (parishId: string, scope: "CLERGY_ONLY" | "ADMIN_ALL" | "ADMIN_SPECIFIC") => {
    const cacheKey = `${parishId}:${scope}`;
    if (leaderCache.has(cacheKey)) {
      return leaderCache.get(cacheKey) ?? [];
    }

    const roles: ParishRole[] = scope === "CLERGY_ONLY" ? ["SHEPHERD"] : ["ADMIN", "SHEPHERD"];
    const leaders = await prisma.membership.findMany({
      where: {
        parishId,
        role: { in: roles }
      },
      select: {
        userId: true,
        role: true,
        notifyEmailEnabled: true,
        user: {
          select: {
            email: true,
            name: true
          }
        }
      }
    });

    const mapped = leaders
      .filter((leader) => Boolean(leader.user.email))
      .map((leader) => ({
        userId: leader.userId,
        role: leader.role,
        notifyEmailEnabled: leader.notifyEmailEnabled,
        email: leader.user.email ?? "",
        name: leader.user.name
      }));

    leaderCache.set(cacheKey, mapped);
    return mapped;
  };

  let sent = 0;
  let skipped = 0;

  for (const request of requests) {
    const parishName = request.parish?.name ?? "Your parish";
    const requestTypeLabel = getRequestTypeLabel(request.type);
    let recipients: ReminderRecipient[] = [];

    if (request.assignedToUserId) {
      const assignee = await prisma.membership.findUnique({
        where: {
          parishId_userId: {
            parishId: request.parishId,
            userId: request.assignedToUserId
          }
        },
        select: {
          userId: true,
          role: true,
          notifyEmailEnabled: true,
          user: {
            select: {
              email: true,
              name: true
            }
          }
        }
      });

      if (assignee?.user.email) {
        const isClergyOnly = request.visibilityScope === "CLERGY_ONLY";
        const allowedAssignee = !isClergyOnly || assignee.role === "SHEPHERD";
        if (allowedAssignee) {
          recipients = [
            {
              userId: assignee.userId,
              role: assignee.role,
              notifyEmailEnabled: assignee.notifyEmailEnabled,
              email: assignee.user.email,
              name: assignee.user.name
            }
          ];
        }
      }
    }

    if (recipients.length === 0) {
      recipients = await loadLeaders(request.parishId, request.visibilityScope);
    }

    if (recipients.length === 0) {
      skipped += 1;
      continue;
    }

    const recipientIds: string[] = [];
    for (const recipient of recipients) {
      recipientIds.push(recipient.userId);
      try {
        await sendRequestReminderEmail({
          parishId: request.parishId,
          parishName,
          requestId: request.id,
          requestTitle: request.title,
          requestTypeLabel,
          status: request.status,
          recipient
        });
        sent += 1;
      } catch (error) {
        console.error("Failed to send request reminder email", error);
      }
    }

    try {
      await notifyRequestReminder({
        requestId: request.id,
        requestTitle: request.title,
        parishId: request.parishId,
        recipientIds
      });
    } catch (error) {
      console.error("Failed to send request reminder push", error);
    }

    await prisma.request.update({
      where: { id: request.id },
      data: { lastReminderAt: now }
    });
  }

  return { sent, skipped, total: requests.length };
}
