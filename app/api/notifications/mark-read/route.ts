import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { NotificationType } from "@prisma/client";

type NotificationCategory = "task" | "announcement" | "event" | "message" | "request";

const categoryToNotificationType: Record<NotificationCategory, NotificationType> = {
  task: NotificationType.TASK,
  announcement: NotificationType.ANNOUNCEMENT,
  event: NotificationType.EVENT,
  message: NotificationType.MESSAGE,
  request: NotificationType.REQUEST
};

/**
 * POST /api/notifications/mark-read
 * Body:
 *  - { notificationId: string }
 *  - { category: "task" | "announcement" | "event" | "message" | "request" }
 *  - { all: true }
 *
 * Marks notifications as read by updating the user's "last seen" timestamps.
 * Chat messages are marked read via the existing markRoomRead server action.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const rawCategory = body.category as string | undefined;
    const category =
      rawCategory && rawCategory !== "all"
        ? (rawCategory as NotificationCategory)
        : undefined;
    const notificationId = body.notificationId as string | undefined;
    const markAll = body.all === true || rawCategory === "all";
    const now = new Date();
    const userId = session.user.id;

    const updateData: Record<string, Date> = {};

    if (notificationId) {
      const notification = await prisma.notification.findFirst({
        where: {
          id: notificationId,
          userId,
          parishId: session.user.activeParishId
        }
      });

      if (notification) {
        await prisma.notification.update({
          where: { id: notificationId },
          data: { readAt: now }
        });
      }
      // Do NOT update lastSeen* timestamps for individual notifications.
      // Per-item readAt is sufficient; bumping lastSeen here would mark all
      // legacy items of that category as seen, which is incorrect.
    }

    if (markAll) {
      await prisma.notification.updateMany({
        where: {
          userId,
          parishId: session.user.activeParishId,
          readAt: null
        },
        data: { readAt: now }
      });
    } else if (category) {
      await prisma.notification.updateMany({
        where: {
          userId,
          parishId: session.user.activeParishId,
          type: categoryToNotificationType[category],
          readAt: null
        },
        data: { readAt: now }
      });
    }

    if (category === "task" || markAll) {
      updateData.lastSeenTasksAt = now;
    }
    if (category === "announcement" || markAll) {
      updateData.lastSeenAnnouncementsAt = now;
    }
    if (category === "event" || markAll) {
      updateData.lastSeenEventsAt = now;
    }
    if (category === "request" || markAll) {
      updateData.lastSeenRequestsAt = now;
    }

    if (markAll || category === "message") {
      // Also mark all chat rooms as read
      const channels = await prisma.chatChannel.findMany({
        where: { parishId: session.user.activeParishId },
        select: { id: true }
      });

      if (channels.length > 0) {
        await Promise.all(
          channels.map((ch: { id: string }) =>
            prisma.chatRoomReadState.upsert({
              where: { roomId_userId: { roomId: ch.id, userId } },
              update: { lastReadAt: now },
              create: { roomId: ch.id, userId, lastReadAt: now }
            })
          )
        );
      }
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: updateData
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[notifications/mark-read] Error:", error);
    return NextResponse.json(
      { error: "Failed to mark notifications as read" },
      { status: 500 }
    );
  }
}
