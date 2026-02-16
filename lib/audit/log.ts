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

export async function auditLog(db: AuditDbClient, input: AuditLogInput) {
  return db.auditLog.create({
    data: {
      parishId: input.parishId,
      actorUserId: input.actorUserId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: input.metadata ?? Prisma.JsonNull
    }
  });
}
