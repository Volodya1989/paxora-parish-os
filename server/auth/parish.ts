import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { getParishMembership } from "@/server/db/groups";

export class ParishAuthError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ParishAuthError";
    this.status = status;
  }
}

export function mapParishAuthError(error: unknown) {
  if (error instanceof ParishAuthError) {
    return {
      status: error.status,
      body: {
        error: {
          code: error.message.toUpperCase().replace(/\s+/g, "_"),
          message: error.message
        }
      }
    };
  }

  return {
    status: 500,
    body: {
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error"
      }
    }
  };
}

export function assertSessionWithActiveParish(session: Session | null) {
  if (!session?.user?.id || !session.user.activeParishId) {
    throw new ParishAuthError("Unauthorized", 401);
  }

  return {
    userId: session.user.id,
    activeParishId: session.user.activeParishId
  };
}

export async function requireActiveParishSession() {
  const session = await getServerSession(authOptions);
  return assertSessionWithActiveParish(session);
}

export function ensureActiveParishIdMatches(activeParishId: string, targetParishId: string) {
  if (activeParishId !== targetParishId) {
    throw new ParishAuthError("Not found", 404);
  }
}

export async function requireParishMembershipInActiveParish(userId: string, activeParishId: string) {
  const membership = await getParishMembership(activeParishId, userId);

  if (!membership) {
    throw new ParishAuthError("Forbidden", 403);
  }

  return membership;
}
