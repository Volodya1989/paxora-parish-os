"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/server/auth/options";
import { prisma } from "@/server/db/prisma";
import { requireAdminOrShepherd } from "@/server/auth/permissions";
import { createRequestSchema } from "@/lib/validation/requests";
import { getDefaultVisibilityForType, getRequestTypeLabel } from "@/lib/requests/utils";
import { sendRequestAssignmentEmail } from "@/lib/email/requestNotifications";
import { notifyRequestAssigned } from "@/lib/push/notify";

export type RequestActionResult = { status: "success" | "error"; message?: string };

export async function createRequest(formData: FormData): Promise<RequestActionResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    return { status: "error", message: "Please sign in to submit a request." };
  }

  const parsed = createRequestSchema.safeParse({
    type: formData.get("type")?.toString(),
    title: formData.get("title")?.toString(),
    preferredTimeWindow: formData.get("preferredTimeWindow")?.toString() ?? undefined,
    notes: formData.get("notes")?.toString() ?? undefined
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.errors[0]?.message ?? "Invalid request." };
  }

  const { type, title, preferredTimeWindow, notes } = parsed.data;
  const visibilityScope = getDefaultVisibilityForType(type);
  const details: Record<string, string> = {};

  if (preferredTimeWindow) {
    details.preferredTimeWindow = preferredTimeWindow;
  }
  if (notes) {
    details.notes = notes;
  }

  await prisma.request.create({
    data: {
      parishId: session.user.activeParishId,
      createdByUserId: session.user.id,
      type,
      title,
      visibilityScope,
      details: Object.keys(details).length ? details : null
    }
  });

  revalidatePath("/requests");

  return { status: "success" };
}

export async function updateRequestStatus(input: {
  requestId: string;
  status: "SUBMITTED" | "ACKNOWLEDGED" | "SCHEDULED" | "COMPLETED" | "CANCELED";
}): Promise<RequestActionResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    return { status: "error", message: "Unauthorized" };
  }

  const parishId = session.user.activeParishId;
  await requireAdminOrShepherd(session.user.id, parishId);

  const updated = await prisma.request.updateMany({
    where: { id: input.requestId, parishId },
    data: { status: input.status }
  });

  if (!updated.count) {
    return { status: "error", message: "Request not found." };
  }

  revalidatePath("/admin/requests");
  revalidatePath("/requests");

  return { status: "success" };
}

export async function updateRequestVisibility(input: {
  requestId: string;
  visibilityScope: "CLERGY_ONLY" | "ADMIN_ALL" | "ADMIN_SPECIFIC";
}): Promise<RequestActionResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    return { status: "error", message: "Unauthorized" };
  }

  const parishId = session.user.activeParishId;
  await requireAdminOrShepherd(session.user.id, parishId);

  const request = await prisma.request.findUnique({
    where: { id: input.requestId },
    select: { assignedToUserId: true, parishId: true }
  });

  if (!request || request.parishId !== parishId) {
    return { status: "error", message: "Request not found." };
  }

  if (input.visibilityScope === "CLERGY_ONLY" && request.assignedToUserId) {
    const assignee = await prisma.membership.findUnique({
      where: {
        parishId_userId: {
          parishId: request.parishId,
          userId: request.assignedToUserId
        }
      },
      select: { role: true }
    });

    if (assignee && assignee.role !== "SHEPHERD") {
      return {
        status: "error",
        message: "Clergy-only requests can only be assigned to clergy."
      };
    }
  }

  await prisma.request.update({
    where: { id: input.requestId },
    data: { visibilityScope: input.visibilityScope }
  });

  revalidatePath("/admin/requests");
  revalidatePath("/requests");

  return { status: "success" };
}

export async function assignRequest(input: {
  requestId: string;
  assigneeId: string | null;
}): Promise<RequestActionResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.activeParishId) {
    return { status: "error", message: "Unauthorized" };
  }

  const parishId = session.user.activeParishId;
  await requireAdminOrShepherd(session.user.id, parishId);

  const request = await prisma.request.findUnique({
    where: { id: input.requestId },
    select: {
      id: true,
      parishId: true,
      title: true,
      type: true,
      visibilityScope: true,
      assignedToUserId: true
    }
  });

  if (!request || request.parishId !== parishId) {
    return { status: "error", message: "Request not found." };
  }

  if (request.assignedToUserId === input.assigneeId) {
    return { status: "success" };
  }

  let assignee = null as null | {
    userId: string;
    role: "ADMIN" | "SHEPHERD" | "MEMBER";
    notifyEmailEnabled: boolean;
    user: { email: string; name: string | null };
  };

  if (input.assigneeId) {
    assignee = await prisma.membership.findUnique({
      where: {
        parishId_userId: {
          parishId,
          userId: input.assigneeId
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

    if (!assignee) {
      return { status: "error", message: "Assignee not found." };
    }

    if (request.visibilityScope === "CLERGY_ONLY" && assignee.role !== "SHEPHERD") {
      return {
        status: "error",
        message: "Clergy-only requests can only be assigned to clergy."
      };
    }
  }

  await prisma.request.update({
    where: { id: input.requestId },
    data: { assignedToUserId: input.assigneeId }
  });

  if (assignee && assignee.user.email) {
    const parish = await prisma.parish.findUnique({
      where: { id: parishId },
      select: { name: true }
    });

    if (parish) {
      try {
        await sendRequestAssignmentEmail({
          parishId,
          parishName: parish.name,
          requestId: request.id,
          requestTitle: request.title,
          requestTypeLabel: getRequestTypeLabel(request.type),
          assignee: {
            userId: assignee.userId,
            email: assignee.user.email,
            name: assignee.user.name,
            notifyEmailEnabled: assignee.notifyEmailEnabled,
            role: assignee.role
          }
        });
      } catch (error) {
        console.error("Failed to send request assignment email", error);
      }
    }

    try {
      await notifyRequestAssigned({
        requestId: request.id,
        requestTitle: request.title,
        parishId,
        assigneeId: assignee.userId
      });
    } catch (error) {
      console.error("Failed to send request assignment push", error);
    }
  }

  revalidatePath("/admin/requests");
  revalidatePath("/requests");

  return { status: "success" };
}
