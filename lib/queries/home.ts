import { getServerSession } from "next-auth";
import { Prisma, TaskApprovalStatus, TaskVisibility } from "@prisma/client";
import { unstable_noStore as noStore } from "next/cache";
import { authOptions } from "@/server/auth/options";
import { ensureParishBootstrap } from "@/server/auth/bootstrap";
import { prisma } from "@/server/db/prisma";
import { getOrCreateCurrentWeek } from "@/domain/week";
import { getNow } from "@/lib/time/getNow";
import { listAnnouncements } from "@/lib/queries/announcements";
import { listEventsForWeek } from "@/lib/queries/events";

export type HomeWeekCompletion = {
  completedCount: number;
  totalCount: number;
  percent: number;
};

export type HomeEventPreview = {
  id: string;
  title: string;
  startsAt: Date;
  location: string | null;
};

export type HomeAnnouncementPreview = {
  id: string;
  title: string;
  updatedAt: Date;
  publishedAt: Date | null;
};

export type HomeRecentUpdate = {
  id: string;
  type: "task" | "event" | "announcement";
  title: string;
  occurredAt: Date;
  href: string;
};

export type HomeSummary = {
  weekCompletion: HomeWeekCompletion;
  nextEvents: HomeEventPreview[];
  announcements: HomeAnnouncementPreview[];
  recentUpdates: HomeRecentUpdate[];
};

export type CommunityRoomPreview = {
  id: string;
  name: string;
  lastMessage: string | null;
  unreadCount?: number | null;
};

async function resolveParishId(userId: string, activeParishId?: string | null) {
  if (activeParishId) {
    const parish = await prisma.parish.findUnique({
      where: { id: activeParishId },
      select: { id: true }
    });

    if (parish?.id) {
      return parish.id;
    }
  }

  return ensureParishBootstrap(userId);
}

export async function getHomeSummary({
  now = getNow()
}: {
  now?: Date;
} = {}): Promise<HomeSummary> {
  noStore();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const actorUserId = session.user.id;
  const parishId = await resolveParishId(session.user.id, session.user.activeParishId);
  const week = await getOrCreateCurrentWeek(parishId, now);
  const visibilityWhere: Prisma.TaskWhereInput = {
    OR: [
      { visibility: TaskVisibility.PUBLIC, approvalStatus: TaskApprovalStatus.APPROVED },
      { ownerId: actorUserId },
      { createdById: actorUserId }
    ]
  };

  const [taskCounts, recentTasks, events, publishedAnnouncements] = await Promise.all([
    prisma.task.groupBy({
      by: ["status"],
      where: { parishId, weekId: week.id, archivedAt: null, AND: [visibilityWhere] },
      _count: { _all: true }
    }),
    prisma.task.findMany({
      where: { parishId, weekId: week.id, archivedAt: null, AND: [visibilityWhere] },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        createdAt: true
      }
    }),
    listEventsForWeek({ parishId, getNow: () => now }),
    listAnnouncements({ parishId, status: "published" })
  ]);

  const taskSummary = taskCounts.reduce(
    (acc, item) => {
      const count = item._count?._all ?? 0;
      if (item.status === "DONE") {
        acc.completedCount = count;
      }
      acc.totalCount += count;
      return acc;
    },
    { completedCount: 0, totalCount: 0 }
  );

  const percent =
    taskSummary.totalCount === 0
      ? 0
      : Math.round((taskSummary.completedCount / taskSummary.totalCount) * 100);

  const nextEvents = events
    .filter((event) => event.startsAt >= now)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
    .slice(0, 3)
    .map((event) => ({
      id: event.id,
      title: event.title,
      startsAt: event.startsAt,
      location: event.location
    }));

  const announcements = publishedAnnouncements.slice(0, 3).map((announcement) => ({
    id: announcement.id,
    title: announcement.title,
    updatedAt: announcement.updatedAt,
    publishedAt: announcement.publishedAt
  }));

  const recentUpdates: HomeRecentUpdate[] = [
    ...recentTasks.map((task) => ({
      id: task.id,
      type: "task" as const,
      title: task.title,
      occurredAt: task.createdAt,
      href: "/tasks"
    })),
    ...events.map((event) => ({
      id: event.id,
      type: "event" as const,
      title: event.title,
      occurredAt: event.startsAt,
      href: `/events/${event.id}`
    })),
    ...publishedAnnouncements.map((announcement) => ({
      id: announcement.id,
      type: "announcement" as const,
      title: announcement.title,
      occurredAt: announcement.publishedAt ?? announcement.updatedAt,
      href: "/announcements"
    }))
  ]
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
    .slice(0, 5);

  return {
    weekCompletion: {
      ...taskSummary,
      percent
    },
    nextEvents,
    announcements,
    recentUpdates
  };
}

export async function listCommunityRoomsPreview(): Promise<CommunityRoomPreview[]> {
  // TODO: Replace with real chat room query once A-014 lands.
  return [];
}
