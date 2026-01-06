import type { Session } from "next-auth";
import { getParishMembership } from "@/server/db/groups";

export function assertActiveSession(session: Session | null) {
  if (!session?.user?.id || !session.user.activeParishId) {
    throw new Error("Unauthorized");
  }

  return {
    userId: session.user.id,
    parishId: session.user.activeParishId
  };
}

export async function requireAdminOrShepherd(userId: string, parishId: string) {
  const membership = await getParishMembership(parishId, userId);

  if (!membership) {
    throw new Error("Unauthorized");
  }

  const allowed = membership.role === "ADMIN" || membership.role === "SHEPHERD";

  if (!allowed) {
    throw new Error("Forbidden");
  }

  return membership;
}
