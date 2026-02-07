import { prisma } from "@/server/db/prisma";

export type SuperAdminParishSummary = {
  id: string;
  name: string;
  slug: string;
  timezone: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  createdAt: Date;
  memberCount: number;
  groupCount: number;
  eventCount: number;
  announcementCount: number;
};

export async function listParishSummaries(): Promise<SuperAdminParishSummary[]> {
  const parishes = await prisma.parish.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      timezone: true,
      contactEmail: true,
      contactPhone: true,
      createdAt: true,
      _count: {
        select: {
          memberships: true,
          groups: true,
          events: true,
          announcements: true
        }
      }
    }
  });

  return parishes.map((parish) => ({
    id: parish.id,
    name: parish.name,
    slug: parish.slug,
    timezone: parish.timezone ?? null,
    contactEmail: parish.contactEmail ?? null,
    contactPhone: parish.contactPhone ?? null,
    createdAt: parish.createdAt,
    memberCount: parish._count.memberships,
    groupCount: parish._count.groups,
    eventCount: parish._count.events,
    announcementCount: parish._count.announcements
  }));
}

export async function getParishDetail(parishId: string) {
  return prisma.parish.findUnique({
    where: { id: parishId },
    select: {
      id: true,
      name: true,
      slug: true,
      timezone: true,
      contactEmail: true,
      contactPhone: true,
      createdAt: true
    }
  });
}
