import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";

export type AccessGateStatus = "none" | "pending" | "approved" | "unverified" | "rejected";

export type AccessGateState = {
  status: AccessGateStatus;
  parishId: string | null;
  parishName: string | null;
};

export type PendingAccessRequest = {
  id: string;
  parishId: string;
  parishName: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  requestedAt: Date;
};

async function resolveAccessParishId(userId: string, activeParishId?: string | null) {
  if (activeParishId) {
    const activeMembership = await prisma.membership.findUnique({
      where: {
        parishId_userId: {
          parishId: activeParishId,
          userId
        }
      },
      select: { parishId: true }
    });

    if (activeMembership?.parishId) {
      return activeMembership.parishId;
    }

    // Preserve active parish context for users who are awaiting approval.
    // Without this, users who have a pending/rejected access request but no
    // membership are treated as having no parish context at all.
    const activeRequest = await prisma.accessRequest.findFirst({
      where: {
        parishId: activeParishId,
        userId,
        status: { in: ["PENDING", "REJECTED"] }
      },
      select: { parishId: true }
    });

    if (activeRequest?.parishId) {
      return activeRequest.parishId;
    }
  }

  const fallbackMembership = await prisma.membership.findFirst({
    where: { userId },
    select: { parishId: true }
  });

  if (fallbackMembership?.parishId && activeParishId !== fallbackMembership.parishId) {
    await prisma.user.update({
      where: { id: userId },
      data: { activeParishId: fallbackMembership.parishId }
    });
  }

  return fallbackMembership?.parishId ?? null;
}

export async function getAccessGateState(): Promise<AccessGateState> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const parishId = await resolveAccessParishId(session.user.id, session.user.activeParishId);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { emailVerifiedAt: true }
  });

  if (!parishId) {
    return {
      status: "none",
      parishId: null,
      parishName: null
    };
  }

  const [parish, membership] = await Promise.all([
    prisma.parish.findUnique({
      where: { id: parishId },
      select: { name: true, deactivatedAt: true }
    }),
    prisma.membership.findUnique({
      where: {
        parishId_userId: {
          parishId,
          userId: session.user.id
        }
      },
      select: { id: true }
    })
  ]);

  // Treat deactivated parishes as unusable regardless of membership.
  // Clear the stale activeParishId so the user is prompted to join a live parish.
  if (parish?.deactivatedAt) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { activeParishId: null }
    });
    return { status: "none", parishId: null, parishName: null };
  }

  if (membership) {
    return {
      status: "approved",
      parishId,
      parishName: parish?.name ?? null
    };
  }

  if (!user?.emailVerifiedAt) {
    return {
      status: "unverified",
      parishId,
      parishName: parish?.name ?? null
    };
  }

  const pendingRequest = await prisma.accessRequest.findFirst({
    where: {
      parishId,
      userId: session.user.id,
      status: "PENDING"
    },
    select: { id: true }
  });

  if (pendingRequest) {
    return {
      status: "pending",
      parishId,
      parishName: parish?.name ?? null
    };
  }

  const rejectedRequest = await prisma.accessRequest.findFirst({
    where: {
      parishId,
      userId: session.user.id,
      status: "REJECTED"
    },
    select: { id: true }
  });

  if (rejectedRequest) {
    return {
      status: "rejected",
      parishId,
      parishName: parish?.name ?? null
    };
  }

  return {
    status: "none",
    parishId,
    parishName: parish?.name ?? null
  };
}

export async function getPendingAccessRequests(): Promise<PendingAccessRequest[]> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const memberships = await prisma.membership.findMany({
    where: {
      userId: session.user.id,
      role: { in: ["ADMIN", "SHEPHERD"] }
    },
    select: { parishId: true }
  });

  const parishIds = memberships.map((membership) => membership.parishId);

  if (!parishIds.length) {
    return [];
  }

  const requests = await prisma.accessRequest.findMany({
    where: {
      parishId: { in: parishIds },
      status: "PENDING"
    },
    orderBy: { createdAt: "desc" },
    include: {
      parish: {
        select: {
          name: true
        }
      },
      user: {
        select: {
          name: true,
          email: true
        }
      }
    }
  });

  return requests.map((request) => ({
    id: request.id,
    parishId: request.parishId,
    parishName: request.parish.name,
    userId: request.userId,
    userName: request.user.name,
    userEmail: request.user.email,
    requestedAt: request.createdAt
  }));
}
