import { NotificationType } from "@prisma/client";
import { prisma } from "@/server/db/prisma";

type MarkChatReadInput = {
  userId: string;
  parishId: string;
  channelId: string;
  now?: Date;
};

export async function markChatRoomReadAndNotifications(input: MarkChatReadInput) {
  const now = input.now ?? new Date();

  const [state, notifications] = await prisma.$transaction([
    prisma.chatRoomReadState.upsert({
      where: {
        roomId_userId: {
          roomId: input.channelId,
          userId: input.userId
        }
      },
      update: {
        lastReadAt: now
      },
      create: {
        roomId: input.channelId,
        userId: input.userId,
        lastReadAt: now
      }
    }),
    prisma.notification.updateMany({
      where: {
        userId: input.userId,
        parishId: input.parishId,
        type: { in: [NotificationType.MESSAGE, NotificationType.MENTION] },
        readAt: null,
        href: { contains: `channel=${input.channelId}` }
      },
      data: {
        readAt: now
      }
    })
  ]);

  return {
    roomId: state.roomId,
    lastReadAt: state.lastReadAt,
    clearedNotifications: notifications.count
  };
}

