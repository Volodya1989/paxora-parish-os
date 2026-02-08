import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";

/**
 * POST /api/notifications/mark-read
 * Body: { category: "task" | "announcement" | "event" | "message" | "request" | "all" }
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
    const category = body.category as string;
    const now = new Date();
    const userId = session.user.id;

    const updateData: Record<string, Date> = {};

    if (category === "task" || category === "all") {
      updateData.lastSeenTasksAt = now;
    }
    if (category === "announcement" || category === "all") {
      updateData.lastSeenAnnouncementsAt = now;
    }
    if (category === "event" || category === "all") {
      updateData.lastSeenEventsAt = now;
    }
    if (category === "request" || category === "all") {
      updateData.lastSeenRequestsAt = now;
    }

    if (category === "all" || category === "message") {
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
