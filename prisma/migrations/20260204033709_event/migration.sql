/* ============================================================================
  20260204033709_event — Event Requests
  NOTE: This migration must NOT create or alter ParishIcon (handled later).
============================================================================ */

-- ----------------------------------------------------------------------------
-- CreateEnum: EventRequestStatus (idempotent)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EventRequestStatus') THEN
    CREATE TYPE "EventRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
  END IF;
END
$$;

-- ----------------------------------------------------------------------------
-- CreateEnum: EventRequestCategory (idempotent)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EventRequestCategory') THEN
    CREATE TYPE "EventRequestCategory" AS ENUM ('SERVICE', 'REHEARSAL', 'GATHERING', 'OTHER');
  END IF;
END
$$;

-- ----------------------------------------------------------------------------
-- CreateTable: EventRequest (idempotent)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "EventRequest" (
  "id" TEXT NOT NULL,
  "parishId" TEXT NOT NULL,
  "requesterId" TEXT NOT NULL,
  "contactName" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" "EventRequestCategory" NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "location" TEXT,
  "description" TEXT,
  "participants" INTEGER,
  "status" "EventRequestStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "decidedAt" TIMESTAMP(3),
  "decidedByUserId" TEXT,
  "eventId" TEXT,
  CONSTRAINT "EventRequest_pkey" PRIMARY KEY ("id")
);

-- ----------------------------------------------------------------------------
-- Indexes (idempotent)
-- ----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS "EventRequest_eventId_key" ON "EventRequest"("eventId");
CREATE INDEX IF NOT EXISTS "EventRequest_parishId_status_idx" ON "EventRequest"("parishId", "status");
CREATE INDEX IF NOT EXISTS "EventRequest_requesterId_idx" ON "EventRequest"("requesterId");

-- ----------------------------------------------------------------------------
-- Foreign keys (idempotent)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EventRequest_parishId_fkey') THEN
    ALTER TABLE "EventRequest"
      ADD CONSTRAINT "EventRequest_parishId_fkey"
      FOREIGN KEY ("parishId") REFERENCES "Parish"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EventRequest_requesterId_fkey') THEN
    ALTER TABLE "EventRequest"
      ADD CONSTRAINT "EventRequest_requesterId_fkey"
      FOREIGN KEY ("requesterId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EventRequest_decidedByUserId_fkey') THEN
    ALTER TABLE "EventRequest"
      ADD CONSTRAINT "EventRequest_decidedByUserId_fkey"
      FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EventRequest_eventId_fkey') THEN
    ALTER TABLE "EventRequest"
      ADD CONSTRAINT "EventRequest_eventId_fkey"
      FOREIGN KEY ("eventId") REFERENCES "Event"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
