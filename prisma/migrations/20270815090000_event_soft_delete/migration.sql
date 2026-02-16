-- Add soft-delete support to events
ALTER TABLE "Event"
ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "Event_deletedAt_idx" ON "Event"("deletedAt");
