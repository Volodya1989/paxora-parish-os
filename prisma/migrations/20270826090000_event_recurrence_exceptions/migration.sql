-- Support recurring-event single-occurrence edits/deletes via overrides + exception dates
ALTER TABLE "Event"
  ADD COLUMN "recurrenceParentId" TEXT,
  ADD COLUMN "recurrenceOriginalStartsAt" TIMESTAMP(3);

CREATE TABLE "EventRecurrenceException" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "occurrenceStartsAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EventRecurrenceException_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Event_recurrenceParentId_idx" ON "Event"("recurrenceParentId");
CREATE INDEX "Event_recurrenceParentId_recurrenceOriginalStartsAt_idx" ON "Event"("recurrenceParentId", "recurrenceOriginalStartsAt");
CREATE INDEX "EventRecurrenceException_eventId_idx" ON "EventRecurrenceException"("eventId");

CREATE UNIQUE INDEX "EventRecurrenceException_eventId_occurrenceStartsAt_key"
  ON "EventRecurrenceException"("eventId", "occurrenceStartsAt");

ALTER TABLE "Event"
  ADD CONSTRAINT "Event_recurrenceParentId_fkey"
  FOREIGN KEY ("recurrenceParentId") REFERENCES "Event"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventRecurrenceException"
  ADD CONSTRAINT "EventRecurrenceException_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
