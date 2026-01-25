"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authOptions } from "@/server/auth/options";
import { ParishRole } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { issueEmailVerification } from "@/lib/auth/emailVerification";
import {
  selectJoinRequestAdminRecipients,
  sendJoinRequestAdminNotificationEmail,
  sendJoinRequestDecisionEmail,
  sendJoinRequestSubmittedEmail
} from "@/lib/email/joinRequests";

function assertSession() {
  return getServerSession(authOptions).then((session) => {
    if (!session?.user?.id) {
      throw new Error("Unauthorized");
    }
    return session;
  });
}

export async function requestParishAccess(formData: FormData) {
  const session = await assertSession();
  const parishId = String(formData.get("parishId") ?? "").trim();

  if (!parishId) {
    throw new Error("Missing parish");
  }

  const requester = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { emailVerifiedAt: true }
  });

  if (!requester?.emailVerifiedAt) {
    await issueEmailVerification(session.user.id);
    redirect("/access?verify=sent");
  }

  const membership = await prisma.membership.findUnique({
    where: {
      parishId_userId: {
        parishId,
        userId: session.user.id
      }
    }
  });

  if (membership) {
    return;
  }

  const request = await prisma.accessRequest.upsert({
    where: {
      parishId_userId: {
        parishId,
        userId: session.user.id
      }
    },
    update: {
      status: "PENDING"
    },
    create: {
      parishId,
      userId: session.user.id,
      status: "PENDING"
    },
    include: {
      parish: {
        select: { name: true }
      },
      user: {
        select: { email: true, name: true }
      }
    }
  });

  try {
    await sendJoinRequestSubmittedEmail({
      parishId,
      parishName: request.parish.name,
      requesterId: session.user.id,
      requesterEmail: request.user.email,
      requesterName: request.user.name
    });
  } catch (error) {
    console.error("Failed to send join request confirmation email", error);
  }

  const adminMemberships = await prisma.membership.findMany({
    where: {
      parishId,
      role: {
        in: ["ADMIN", "SHEPHERD"]
      }
    },
    select: {
      userId: true,
      role: true,
      notifyEmailEnabled: true,
      user: {
        select: {
          email: true,
          name: true
        }
      }
    }
  });

  const admins = selectJoinRequestAdminRecipients(
    adminMemberships.map((membership) => ({
      userId: membership.userId,
      role: membership.role,
      notifyEmailEnabled: membership.notifyEmailEnabled,
      email: membership.user.email,
      name: membership.user.name
    }))
  );

  await Promise.all(
    admins.map(async (admin) => {
      try {
        await sendJoinRequestAdminNotificationEmail({
          parishId,
          parishName: request.parish.name,
          requesterId: request.userId,
          requesterEmail: request.user.email,
          requesterName: request.user.name,
          admin,
          joinRequestId: request.id
        });
      } catch (error) {
        console.error("Failed to send join request admin notification", error);
      }
    })
  );

  revalidatePath("/access");
  revalidatePath("/profile");
}

type ApproveAccessInput = {
  parishId: string;
  userId: string;
  role: ParishRole;
};

const parseRole = (value: string | null): ParishRole => {
  const normalized = (value ?? "").trim().toUpperCase();
  if (normalized.length === 0) {
    return "MEMBER";
  }
  if (normalized === "ADMIN" || normalized === "MEMBER" || normalized === "SHEPHERD") {
    return normalized as ParishRole;
  }
  throw new Error("Role is required for approval");
};

const parseApproveInput = (input: FormData | ApproveAccessInput): ApproveAccessInput => {
  if (input instanceof FormData) {
    return {
      parishId: String(input.get("parishId") ?? "").trim(),
      userId: String(input.get("userId") ?? "").trim(),
      role: parseRole(String(input.get("role") ?? ""))
    };
  }

  return input;
};

export async function approveParishAccess(input: FormData | ApproveAccessInput) {
  const session = await assertSession();
  const { parishId, userId, role } = parseApproveInput(input);

  if (!parishId || !userId) {
    throw new Error("Missing approval details");
  }

  const approverMembership = await prisma.membership.findUnique({
    where: {
      parishId_userId: {
        parishId,
        userId: session.user.id
      }
    },
    select: { role: true }
  });

  if (!approverMembership || !["ADMIN", "SHEPHERD"].includes(approverMembership.role)) {
    throw new Error("Unauthorized");
  }

  await prisma.$transaction(async (tx) => {
    await tx.membership.upsert({
      where: {
        parishId_userId: {
          parishId,
          userId
        }
      },
      update: { role },
      create: {
        parishId,
        userId,
        role
      }
    });

    await tx.accessRequest.updateMany({
      where: {
        parishId,
        userId
      },
      data: {
        status: "APPROVED"
      }
    });
  });

  const request = await prisma.accessRequest.findUnique({
    where: {
      parishId_userId: {
        parishId,
        userId
      }
    },
    include: {
      parish: {
        select: { name: true }
      },
      user: {
        select: { email: true, name: true }
      }
    }
  });

  if (request) {
    try {
      await sendJoinRequestDecisionEmail({
        parishId,
        parishName: request.parish.name,
        requesterId: request.userId,
        requesterEmail: request.user.email,
        requesterName: request.user.name,
        decision: "APPROVED"
      });
    } catch (error) {
      console.error("Failed to send join request approval email", error);
    }
  }

  revalidatePath("/access");
  revalidatePath("/profile");
  revalidatePath("/tasks");
}

type RejectAccessInput = {
  parishId: string;
  userId: string;
};

const parseRejectInput = (input: FormData | RejectAccessInput): RejectAccessInput => {
  if (input instanceof FormData) {
    return {
      parishId: String(input.get("parishId") ?? "").trim(),
      userId: String(input.get("userId") ?? "").trim()
    };
  }

  return input;
};

export async function rejectParishAccess(input: FormData | RejectAccessInput) {
  const session = await assertSession();
  const { parishId, userId } = parseRejectInput(input);

  if (!parishId || !userId) {
    throw new Error("Missing rejection details");
  }

  const approverMembership = await prisma.membership.findUnique({
    where: {
      parishId_userId: {
        parishId,
        userId: session.user.id
      }
    },
    select: { role: true }
  });

  if (!approverMembership || !["ADMIN", "SHEPHERD"].includes(approverMembership.role)) {
    throw new Error("Unauthorized");
  }

  await prisma.accessRequest.updateMany({
    where: {
      parishId,
      userId
    },
    data: {
      status: "REJECTED"
    }
  });

  const request = await prisma.accessRequest.findUnique({
    where: {
      parishId_userId: {
        parishId,
        userId
      }
    },
    include: {
      parish: {
        select: { name: true }
      },
      user: {
        select: { email: true, name: true }
      }
    }
  });

  if (request) {
    try {
      await sendJoinRequestDecisionEmail({
        parishId,
        parishName: request.parish.name,
        requesterId: request.userId,
        requesterEmail: request.user.email,
        requesterName: request.user.name,
        decision: "REJECTED"
      });
    } catch (error) {
      console.error("Failed to send join request rejection email", error);
    }
  }

  revalidatePath("/access");
  revalidatePath("/profile");
  revalidatePath("/tasks");
}
