DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'RequestStatus'
  ) THEN
    CREATE TYPE "RequestStatus" AS ENUM ('SUBMITTED', 'ACKNOWLEDGED', 'SCHEDULED', 'COMPLETED', 'CANCELED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'VisibilityScope'
  ) THEN
    CREATE TYPE "VisibilityScope" AS ENUM ('CLERGY_ONLY', 'ADMIN_ALL', 'ADMIN_SPECIFIC');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'RequestType'
  ) THEN
    CREATE TYPE "RequestType" AS ENUM ('CONFESSION', 'LITURGICAL', 'PRAYER', 'TALK_TO_PRIEST');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "Request" (
  "id" TEXT NOT NULL,
  "parishId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "assignedToUserId" TEXT,
  "type" "RequestType" NOT NULL,
  "status" "RequestStatus" NOT NULL DEFAULT 'SUBMITTED',
  "visibilityScope" "VisibilityScope" NOT NULL DEFAULT 'ADMIN_ALL',
  "title" TEXT NOT NULL,
  "details" JSONB,
  "lastReminderAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Request_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Request_parishId_status_idx" ON "Request"("parishId", "status");
CREATE INDEX IF NOT EXISTS "Request_parishId_createdByUserId_idx" ON "Request"("parishId", "createdByUserId");
CREATE INDEX IF NOT EXISTS "Request_parishId_assignedToUserId_idx" ON "Request"("parishId", "assignedToUserId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Request_parishId_fkey'
  ) THEN
    ALTER TABLE "Request" ADD CONSTRAINT "Request_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Request_createdByUserId_fkey'
  ) THEN
    ALTER TABLE "Request" ADD CONSTRAINT "Request_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Request_assignedToUserId_fkey'
  ) THEN
    ALTER TABLE "Request" ADD CONSTRAINT "Request_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
