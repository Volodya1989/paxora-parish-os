import { prisma } from "@/server/db/prisma";

type GroupListRecord = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  archivedAt: Date | null;
  _count?: {
    memberships: number;
  };
};

export type GroupListItem = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  archivedAt: Date | null;
  memberCount: number | null;
};

export async function listGroups(parishId: string, includeArchived = true) {
  const groups = (await prisma.group.findMany({
    where: {
      parishId,
      ...(includeArchived ? {} : { archivedAt: null })
    },
    orderBy: [{ archivedAt: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
      archivedAt: true,
      _count: {
        select: {
          memberships: true
        }
      }
    }
  } as any)) as unknown as GroupListRecord[];

  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    description: group.description,
    createdAt: group.createdAt,
    archivedAt: group.archivedAt,
    memberCount: group._count?.memberships ?? null
  }));
}
