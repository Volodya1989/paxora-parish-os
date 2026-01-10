import { prisma } from "@/server/db/prisma";
import { getNow as defaultGetNow } from "@/lib/time/getNow";

export type AnnouncementStatus = "draft" | "published";

export type AnnouncementListItem = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  archivedAt: Date | null;
};

type ListAnnouncementsInput = {
  parishId: string;
  status: AnnouncementStatus;
  getNow?: () => Date;
};

export async function listAnnouncements({ parishId, status, getNow }: ListAnnouncementsInput) {
  const resolveNow = getNow ?? defaultGetNow;
  void resolveNow;

  const where = {
    parishId,
    archivedAt: null,
    ...(status === "draft" ? { publishedAt: null } : { publishedAt: { not: null } })
  };

  return (await prisma.announcement.findMany({
    where,
    orderBy:
      status === "draft"
        ? [{ updatedAt: "desc" }, { createdAt: "desc" }]
        : [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      publishedAt: true,
      archivedAt: true
    }
  })) as AnnouncementListItem[];
}
