-- Expand AuditLog for MVP admin accountability trail
ALTER TABLE "AuditLog"
  ADD COLUMN "parishId" TEXT,
  ADD COLUMN "targetType" TEXT,
  ADD COLUMN "targetId" TEXT,
  ADD COLUMN "metadata" JSONB;

UPDATE "AuditLog"
SET
  "parishId" = "targetParishId",
  "targetType" = 'IMPERSONATION',
  "targetId" = "targetParishId";

ALTER TABLE "AuditLog"
  ALTER COLUMN "action" TYPE TEXT USING "action"::TEXT,
  ALTER COLUMN "parishId" SET NOT NULL,
  ALTER COLUMN "targetType" SET NOT NULL,
  ALTER COLUMN "targetId" SET NOT NULL;

ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_targetParishId_fkey";
DROP INDEX IF EXISTS "AuditLog_targetParishId_createdAt_idx";

ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_parishId_fkey"
  FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "AuditLog_parishId_idx" ON "AuditLog"("parishId");
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

ALTER TABLE "AuditLog" DROP COLUMN "targetParishId";
DROP INDEX IF EXISTS "AuditLog_actorUserId_createdAt_idx";

DROP TYPE IF EXISTS "AuditAction";
