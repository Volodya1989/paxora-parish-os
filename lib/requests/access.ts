import type { ParishRole } from "@prisma/client";
import type { VisibilityScope } from "@prisma/client";

export type RequestAccessContext = {
  viewerId: string;
  viewerRole: ParishRole | null;
  createdByUserId: string;
  assignedToUserId?: string | null;
  visibilityScope: VisibilityScope;
};

export function canViewRequest(context: RequestAccessContext): boolean {
  const { viewerId, viewerRole, createdByUserId, assignedToUserId, visibilityScope } = context;

  if (viewerId === createdByUserId) {
    return true;
  }

  if (!viewerRole) {
    return false;
  }

  if (viewerRole === "SHEPHERD") {
    return true;
  }

  if (viewerRole === "ADMIN") {
    if (visibilityScope === "ADMIN_ALL") {
      return true;
    }

    if (visibilityScope === "ADMIN_SPECIFIC") {
      return assignedToUserId === viewerId;
    }
  }

  if (visibilityScope === "ADMIN_SPECIFIC") {
    return assignedToUserId === viewerId;
  }

  return false;
}
