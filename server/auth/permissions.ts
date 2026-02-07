import type { Session } from "next-auth";
import { getParishMembership } from "@/server/db/groups";
import { isSuperAdmin, requireSuperAdmin } from "@/server/auth/super-admin";

export function assertActiveSession(session: Session | null) {
  if (!session?.user?.id || !session.user.activeParishId) {
    throw new Error("Unauthorized");
  }

  return {
    userId: session.user.id,
    parishId: session.user.activeParishId
  };
}

export { isSuperAdmin, requireSuperAdmin };

export async function requireAdminOrShepherd(userId: string, parishId: string) {
  const superAdmin = await isSuperAdmin(userId);

  if (superAdmin) {
    return { id: "super-admin", role: "ADMIN" as const };
  }

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
