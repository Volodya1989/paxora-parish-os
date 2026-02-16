import { prisma } from "@/server/db/prisma";

export async function deleteNotificationForUser(opts: {
  notificationId: string;
  userId: string;
  parishId: string;
}) {
  const existing = await prisma.notification.findFirst({
    where: {
      id: opts.notificationId,
      userId: opts.userId,
      parishId: opts.parishId
    },
    select: { id: true }
  });

  if (!existing) {
    return { ok: false as const, status: 404 as const };
  }

  await prisma.notification.delete({ where: { id: existing.id } });
  return { ok: true as const, status: 200 as const };
}
