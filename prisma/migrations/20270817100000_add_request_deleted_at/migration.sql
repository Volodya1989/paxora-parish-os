ALTER TABLE "Request"
ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Request_parishId_deletedAt_archivedAt_status_idx"
ON "Request"("parishId", "deletedAt", "archivedAt", "status");
