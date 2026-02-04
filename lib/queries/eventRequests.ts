import { prisma } from "@/server/db/prisma";
import { isParishLeader } from "@/lib/permissions";
import { getParishMembership } from "@/server/db/groups";
import type { EventRequestCategory } from "@prisma/client";

export type PendingEventRequest = {
  id: string;
  title: string;
  category: EventRequestCategory;
  startsAt: Date;
  endsAt: Date;
  location: string | null;
  description: string | null;
  participants: number | null;
  contactName: string;
  requester: {
    id: string;
    name: string | null;
  };
};

export async function listPendingEventRequests({
  parishId,
  actorUserId
}: {
  parishId: string;
  actorUserId: string;
}): Promise<PendingEventRequest[]> {
  const membership = await getParishMembership(parishId, actorUserId);

  if (!membership || !isParishLeader(membership.role)) {
    return [];
  }

  return prisma.eventRequest.findMany({
    where: {
      parishId,
      status: "PENDING"
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      title: true,
      category: true,
      startsAt: true,
      endsAt: true,
      location: true,
      description: true,
      participants: true,
      contactName: true,
      requester: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });
}
