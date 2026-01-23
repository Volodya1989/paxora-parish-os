import { prisma } from "@/server/db/prisma";
import { getNow as defaultGetNow } from "@/lib/time/getNow";

export type AnnouncementStatus = "draft" | "published";

export type AnnouncementListItem = {
  id: string;
  title: string;
  body: string | null;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  archivedAt: Date | null;
  createdBy: {
    id: string;
    name: string;
  } | null;
};

export type AnnouncementDetail = {
  id: string;
  title: string;
  body: string | null;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  createdBy: {
    id: string;
    name: string;
  } | null;
};

type ListAnnouncementsInput = {
  parishId: string;
  status: AnnouncementStatus;
  getNow?: () => Date;
};

export async function getAnnouncement({
  parishId,
  announcementId
}: {
  parishId: string;
  announcementId: string;
}): Promise<AnnouncementDetail | null> {
  const announcement = await prisma.announcement.findFirst({
    where: {
      id: announcementId,
      parishId,
      archivedAt: null
    },
    select: {
      id: true,
      title: true,
      body: true,
      createdAt: true,
      updatedAt: true,
      publishedAt: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  if (!announcement) {
    return null;
  }

  return {
    ...announcement,
    body: announcement.body ?? null,
    createdBy: announcement.createdBy
      ? {
          id: announcement.createdBy.id,
          name: announcement.createdBy.name ?? announcement.createdBy.email ?? "Parish staff"
        }
      : null
  };
}

export async function listAnnouncements({ parishId, status, getNow }: ListAnnouncementsInput) {
  const resolveNow = getNow ?? defaultGetNow;
  void resolveNow;

  const where = {
    parishId,
    archivedAt: null,
    ...(status === "draft" ? { publishedAt: null } : { publishedAt: { not: null } })
  };

  const announcements = await prisma.announcement.findMany({
    where,
    orderBy:
      status === "draft"
        ? [{ updatedAt: "desc" }, { createdAt: "desc" }]
        : [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      body: true,
      createdAt: true,
      updatedAt: true,
      publishedAt: true,
      archivedAt: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  return announcements.map((announcement) => ({
    ...announcement,
    body: announcement.body ?? null,
    createdBy: announcement.createdBy
      ? {
          id: announcement.createdBy.id,
          name: announcement.createdBy.name ?? announcement.createdBy.email ?? "Parish staff"
        }
      : null
  })) as AnnouncementListItem[];
}
