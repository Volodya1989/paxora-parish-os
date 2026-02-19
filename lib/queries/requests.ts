import { Prisma, type RequestStatus, type RequestType, type VisibilityScope } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { getParishMembership } from "@/server/db/groups";
import { isParishLeader } from "@/lib/permissions";
import { canViewRequest } from "@/lib/requests/access";
import { isRequestOverdue, REQUEST_OVERDUE_STALE_DAYS, REQUEST_OVERDUE_SUBMITTED_HOURS } from "@/lib/requests/utils";

export type RequestListItem = {
  id: string;
  title: string;
  type: RequestType;
  status: RequestStatus;
  visibilityScope: VisibilityScope;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
  assignedTo: { id: string; name: string | null; email: string } | null;
};

export type RequestDetail = RequestListItem & {
  details: Prisma.JsonValue | null;
  createdBy: { id: string; name: string | null; email: string };
};

export type RequestBoardFilters = {
  type?: RequestType | null;
  assigneeId?: string | null;
  visibilityScope?: VisibilityScope | null;
  overdue?: boolean;
  includeArchived?: boolean;
  search?: string | null;
};

export async function listMyRequests(parishId: string, userId: string): Promise<RequestListItem[]> {
  try {
    return await prisma.request.findMany({
      where: {
        parishId,
        createdByUserId: userId,
        deletedAt: null,
        archivedAt: null
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        visibilityScope: true,
        createdAt: true,
        updatedAt: true,
        archivedAt: true,
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
      return [];
    }
    throw error;
  }
}

export async function listRequestsForBoard(
  parishId: string,
  userId: string,
  filters: RequestBoardFilters
): Promise<RequestDetail[]> {
  const membership = await getParishMembership(parishId, userId);
  if (!membership || !isParishLeader(membership.role)) {
    return [];
  }

  const andFilters: Prisma.RequestWhereInput[] = [];

  if (membership.role === "ADMIN") {
    andFilters.push({
      OR: [
        { visibilityScope: "ADMIN_ALL" },
        { visibilityScope: "ADMIN_SPECIFIC", assignedToUserId: userId },
        { createdByUserId: userId }
      ]
    });
  }

  if (filters.type) {
    andFilters.push({ type: filters.type });
  }

  if (filters.assigneeId) {
    andFilters.push({ assignedToUserId: filters.assigneeId });
  }

  if (filters.visibilityScope) {
    andFilters.push({ visibilityScope: filters.visibilityScope });
  }

  if (filters.search?.trim()) {
    const query = filters.search.trim();
    andFilters.push({
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { createdBy: { name: { contains: query, mode: "insensitive" } } },
        { createdBy: { email: { contains: query, mode: "insensitive" } } },
        { assignedTo: { name: { contains: query, mode: "insensitive" } } },
        { assignedTo: { email: { contains: query, mode: "insensitive" } } }
      ]
    });
  }

  if (filters.overdue) {
    const submittedCutoff = new Date(
      Date.now() - REQUEST_OVERDUE_SUBMITTED_HOURS * 60 * 60 * 1000
    );
    const staleCutoff = new Date(
      Date.now() - REQUEST_OVERDUE_STALE_DAYS * 24 * 60 * 60 * 1000
    );
    andFilters.push({
      OR: [
        { status: "SUBMITTED", createdAt: { lt: submittedCutoff } },
        { status: { in: ["ACKNOWLEDGED", "SCHEDULED"] }, updatedAt: { lt: staleCutoff } }
      ]
    });
  }

  let requests: RequestDetail[] = [];

  try {
    requests = await prisma.request.findMany({
      where: {
        parishId,
        deletedAt: null,
        ...(filters.includeArchived
          ? {}
          : {
              archivedAt: null,
              status: { not: "COMPLETED" }
            }),
        AND: andFilters.length ? andFilters : undefined
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        visibilityScope: true,
        createdAt: true,
        updatedAt: true,
        archivedAt: true,
        details: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
      return [];
    }
    throw error;
  }

  return requests;
}

export async function getRequestDetail(
  parishId: string,
  userId: string,
  requestId: string
): Promise<RequestDetail | null> {
  const membership = await getParishMembership(parishId, userId);

  let request: {
    id: string;
    title: string;
    type: RequestType;
    status: RequestStatus;
    visibilityScope: VisibilityScope;
    createdAt: Date;
    updatedAt: Date;
    details: Prisma.JsonValue | null;
    archivedAt: Date | null;
    deletedAt: Date | null;
    createdByUserId: string;
    assignedToUserId: string | null;
    createdBy: { id: string; name: string | null; email: string };
    assignedTo: { id: string; name: string | null; email: string } | null;
  } | null = null;

  try {
    request = await prisma.request.findFirst({
      where: {
        id: requestId,
        parishId,
        deletedAt: null
      },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        visibilityScope: true,
        createdAt: true,
        updatedAt: true,
        details: true,
        archivedAt: true,
        deletedAt: true,
        createdByUserId: true,
        assignedToUserId: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
      return null;
    }
    throw error;
  }

  if (!request) {
    return null;
  }

  const canView = canViewRequest({
    viewerId: userId,
    viewerRole: membership?.role ?? null,
    createdByUserId: request.createdByUserId,
    assignedToUserId: request.assignedToUserId,
    visibilityScope: request.visibilityScope
  });

  if (!canView) {
    return null;
  }

  return {
    id: request.id,
    title: request.title,
    type: request.type,
    status: request.status,
    visibilityScope: request.visibilityScope,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    archivedAt: request.archivedAt,
    details: request.details,
    createdBy: request.createdBy,
    assignedTo: request.assignedTo
  };
}

export function buildRequestOverdueFlag(request: {
  status: RequestStatus;
  createdAt: Date;
  updatedAt: Date;
}) {
  return isRequestOverdue(request.status, request.createdAt, request.updatedAt);
}
