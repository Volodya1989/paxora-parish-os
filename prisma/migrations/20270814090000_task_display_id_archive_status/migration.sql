ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';

ALTER TABLE "Task"
ADD COLUMN IF NOT EXISTS "displayId" TEXT;

CREATE TABLE IF NOT EXISTS "TaskSequence" (
  "id" TEXT NOT NULL,
  "parishId" TEXT NOT NULL,
  "nextValue" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskSequence_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TaskSequence_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "TaskSequence_parishId_key" ON "TaskSequence"("parishId");

WITH ranked_tasks AS (
  SELECT
    "id",
    "parishId",
    ROW_NUMBER() OVER (PARTITION BY "parishId" ORDER BY "createdAt" ASC, "id" ASC) AS seq
  FROM "Task"
)
UPDATE "Task" t
SET "displayId" = CONCAT('SERV-', ranked_tasks.seq)
FROM ranked_tasks
WHERE t."id" = ranked_tasks."id"
  AND t."displayId" IS NULL;


INSERT INTO "TaskSequence" ("id", "parishId", "nextValue", "createdAt", "updatedAt")
SELECT
  CONCAT('task-seq-', "parishId"),
  "parishId",
  COUNT(*) + 1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Task"
GROUP BY "parishId"
ON CONFLICT ("parishId") DO NOTHING;

ALTER TABLE "Task"
ALTER COLUMN "displayId" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Task_parishId_displayId_key" ON "Task"("parishId", "displayId");
CREATE INDEX IF NOT EXISTS "Task_parishId_status_idx" ON "Task"("parishId", "status");
CREATE INDEX IF NOT EXISTS "Task_parishId_completedAt_idx" ON "Task"("parishId", "completedAt");
