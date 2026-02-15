UPDATE "Task"
SET "status" = 'ARCHIVED'
WHERE "archivedAt" IS NOT NULL
  AND "status" <> 'ARCHIVED';
