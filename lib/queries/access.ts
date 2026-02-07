import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { resolveParishContext } from "@/server/auth/parish-context";
import { prisma } from "@/server/db/prisma";

export type AccessGateStatus = "none" | "pending" | "approved" | "unverified";

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

export async function getAccessGateState(): Promise<AccessGateState> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const { parishId, isSuperAdmin } = await resolveParishContext({
    userId: session.user.id,
    activeParishId: session.user.activeParishId
  });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { emailVerifiedAt: true }
  });

  if (isSuperAdmin) {
    return {
      status: "approved",
      parishId,
      parishName: parishId
        ? (
            await prisma.parish.findUnique({
              where: { id: parishId },
              select: { name: true }
            })
          )?.name ?? null
        : null
    };
  }

  if (!parishId) {
    return {
      status: "none",
      parishId: null,
      parishName: null
    };
  }

  const [parish, membership, accessRequest] = await Promise.all([
    prisma.parish.findUnique({
      where: { id: parishId },
      select: { name: true }
    }),
    prisma.membership.findUnique({
      where: {
        parishId_userId: {
          parishId,
          userId: session.user.id
        }
      },
      select: { id: true }
    }),
    prisma.accessRequest.findUnique({
      where: {
        parishId_userId: {
          parishId,
          userId: session.user.id
        }
      },
      select: { status: true }
    })
  ]);

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

  if (accessRequest?.status === "PENDING") {
    return {
      status: "pending",
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
    orderBy: { createdAt: "asc" },
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
