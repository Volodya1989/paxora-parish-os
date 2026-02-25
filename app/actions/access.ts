"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authOptions } from "@/server/auth/options";
import { ParishRole } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { issueEmailVerification } from "@/lib/auth/emailVerification";
import { buildLocalePathname } from "@/lib/i18n/routing";
import { getLocaleFromCookies } from "@/lib/i18n/server";
import {
  selectJoinRequestAdminRecipients,
  sendJoinRequestAdminNotificationEmail,
  sendJoinRequestDecisionEmail,
  sendJoinRequestSubmittedEmail
} from "@/lib/email/joinRequests";
import { joinParishByCode } from "@/lib/parish/joinByCode";
import { notifyParishJoinDecisionInApp, notifyParishJoinRequestInApp } from "@/lib/notifications/notify";
import { notifyParishJoinDecision, notifyParishJoinRequest } from "@/lib/push/notify";

function assertSession() {
  return getServerSession(authOptions).then((session) => {
    if (!session?.user?.id) {
      throw new Error("Unauthorized");
    }
    return session;
  });
}

async function notifyAdminsOfJoinRequest(opts: {
  parishId: string;
  parishName: string;
  requestId: string;
  requesterId: string;
  requesterName: string | null;
  requesterEmail: string;
}) {
  const adminMemberships = await prisma.membership.findMany({
    where: {
      parishId: opts.parishId,
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
          parishId: opts.parishId,
          parishName: opts.parishName,
          requesterId: opts.requesterId,
          requesterEmail: opts.requesterEmail,
          requesterName: opts.requesterName,
          admin,
          joinRequestId: opts.requestId
        });
      } catch (error) {
        console.error("Failed to send join request admin notification", error);
      }
    })
  );

  try {
    await notifyParishJoinRequestInApp({
      parishId: opts.parishId,
      requesterId: opts.requesterId,
      requesterName: opts.requesterName,
      adminUserIds: adminMemberships.map((membership) => membership.userId),
      parishName: opts.parishName
    });
  } catch (error) {
    console.error("Failed to create join request in-app notifications", error);
  }

  try {
    await notifyParishJoinRequest({
      parishId: opts.parishId,
      requesterId: opts.requesterId,
      requesterName: opts.requesterName,
      adminUserIds: adminMemberships.map((membership) => membership.userId)
    });
  } catch (error) {
    console.error("Failed to send join request push notifications", error);
  }
}

export async function requestParishAccess(formData: FormData) {
  const session = await assertSession();
  const locale = await getLocaleFromCookies();
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
    redirect(buildLocalePathname(locale, "/access?verify=sent"));
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

  await notifyAdminsOfJoinRequest({
    parishId,
    parishName: request.parish.name,
    requestId: request.id,
    requesterId: request.userId,
    requesterEmail: request.user.email,
    requesterName: request.user.name
  });

  revalidatePath(buildLocalePathname(locale, "/access"));
  revalidatePath(buildLocalePathname(locale, "/profile"));
}

export async function joinParishByCodeAction(formData: FormData) {
  const session = await assertSession();
  const locale = await getLocaleFromCookies();
  const code = String(formData.get("code") ?? "");

  const result = await joinParishByCode(session.user.id, code);

  if (result.status === "invalid_code") {
    redirect(buildLocalePathname(locale, "/access?join=invalid"));
  }

  if (result.status === "already_member") {
    redirect(buildLocalePathname(locale, "/this-week"));
  }

  if (result.status === "request_pending") {
    redirect(buildLocalePathname(locale, "/access?join=pending"));
  }

  if (result.status === "request_created") {
    const request = await prisma.accessRequest.findUnique({
      where: {
        parishId_userId: {
          parishId: result.parishId,
          userId: session.user.id
        }
      },
      include: {
        parish: { select: { name: true } },
        user: { select: { email: true, name: true } }
      }
    });

    if (request) {
      try {
        await sendJoinRequestSubmittedEmail({
          parishId: request.parishId,
          parishName: request.parish.name,
          requesterId: session.user.id,
          requesterEmail: request.user.email,
          requesterName: request.user.name
        });
      } catch (error) {
        console.error("Failed to send join request confirmation email", error);
      }

      await notifyAdminsOfJoinRequest({
        parishId: request.parishId,
        parishName: request.parish.name,
        requestId: request.id,
        requesterId: request.userId,
        requesterEmail: request.user.email,
        requesterName: request.user.name
      });
    }

    revalidatePath(buildLocalePathname(locale, "/access"));
    redirect(buildLocalePathname(locale, "/access?join=requested"));
  }

  redirect(buildLocalePathname(locale, "/this-week"));
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
  const locale = await getLocaleFromCookies();
  const { parishId, userId, role } = parseApproveInput(input);

  if (!parishId || !userId) {
    throw new Error("Missing approval details");
  }

  if (userId === session.user.id) {
    throw new Error("You cannot approve your own request");
  }

  if (!session.user.activeParishId || session.user.activeParishId !== parishId) {
    throw new Error("Unauthorized");
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
      },
      select: { id: true }
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

    await tx.user.update({
      where: { id: userId },
      data: { activeParishId: parishId },
      select: { id: true }
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

    try {
      await notifyParishJoinDecisionInApp({
        parishId,
        userId,
        parishName: request.parish.name,
        decision: "APPROVED"
      });
    } catch (error) {
      console.error("Failed to create join request approval in-app notification", error);
    }

    try {
      await notifyParishJoinDecision({
        parishId,
        userId,
        parishName: request.parish.name,
        decision: "APPROVED"
      });
    } catch (error) {
      console.error("Failed to send join request approval push notification", error);
    }
  }

  revalidatePath(buildLocalePathname(locale, "/access"));
  revalidatePath(buildLocalePathname(locale, "/profile"));
  revalidatePath(buildLocalePathname(locale, "/tasks"));
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
  const locale = await getLocaleFromCookies();
  const { parishId, userId } = parseRejectInput(input);

  if (!parishId || !userId) {
    throw new Error("Missing rejection details");
  }

  if (userId === session.user.id) {
    throw new Error("You cannot reject your own request");
  }

  if (!session.user.activeParishId || session.user.activeParishId !== parishId) {
    throw new Error("Unauthorized");
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

    try {
      await notifyParishJoinDecisionInApp({
        parishId,
        userId,
        parishName: request.parish.name,
        decision: "REJECTED"
      });
    } catch (error) {
      console.error("Failed to create join request rejection in-app notification", error);
    }

    try {
      await notifyParishJoinDecision({
        parishId,
        userId,
        parishName: request.parish.name,
        decision: "REJECTED"
      });
    } catch (error) {
      console.error("Failed to send join request rejection push notification", error);
    }
  }

  revalidatePath(buildLocalePathname(locale, "/access"));
  revalidatePath(buildLocalePathname(locale, "/profile"));
  revalidatePath(buildLocalePathname(locale, "/tasks"));
}

export async function updateParishJoinApprovalSetting(formData: FormData) {
  const session = await assertSession();
  const locale = await getLocaleFromCookies();
  const parishId = String(formData.get("parishId") ?? "").trim();
  const requireJoinApproval = String(formData.get("requireJoinApproval") ?? "") === "on";

  if (!parishId) {
    throw new Error("Missing parish");
  }

  if (!session.user.activeParishId || session.user.activeParishId !== parishId) {
    throw new Error("Unauthorized");
  }

  const membership = await prisma.membership.findUnique({
    where: {
      parishId_userId: {
        parishId,
        userId: session.user.id
      }
    },
    select: { role: true }
  });

  if (!membership || !["ADMIN", "SHEPHERD"].includes(membership.role)) {
    throw new Error("Unauthorized");
  }

  await prisma.parish.update({
    where: { id: parishId },
    data: { requireJoinApproval }
  });

  revalidatePath(buildLocalePathname(locale, "/profile"));
}
