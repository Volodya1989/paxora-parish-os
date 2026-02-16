import { Prisma, type PrismaClient } from "@prisma/client";
import type { AuditAction, AuditTargetType } from "@/lib/audit/actions";
import { prisma } from "@/server/db/prisma";

type AuditDbClient = Prisma.TransactionClient | PrismaClient | typeof prisma;

type AuditLogInput = {
  parishId: string;
  actorUserId: string;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string;
  metadata?: Prisma.InputJsonValue | null;
};

/**
 * Strip values that are not JSON-serializable (undefined, functions, symbols)
 * and truncate the result to avoid oversized payloads.
 * Returns a plain JSON-safe object or null.
 */
export function sanitizeMetadata(
  raw: unknown
): Prisma.InputJsonValue | null {
  if (raw === null || raw === undefined) return null;
  try {
    // JSON.parse(JSON.stringify(x)) drops undefined, functions, symbols,
    // and converts Date instances to ISO strings — exactly what we need.
    return JSON.parse(JSON.stringify(raw)) as Prisma.InputJsonValue;
  } catch {
    return null;
  }
}

export async function auditLog(db: AuditDbClient, input: AuditLogInput) {
  return db.auditLog.create({
    data: {
      parishId: input.parishId,
      actorUserId: input.actorUserId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: sanitizeMetadata(input.metadata) ?? Prisma.JsonNull
    }
  });
}
