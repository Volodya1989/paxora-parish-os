-- Ensure access request status enum exists with REJECTED
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'AccessRequestStatus'
  ) THEN
    CREATE TYPE "AccessRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
  ELSIF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'REJECTED'
      AND enumtypid = '"AccessRequestStatus"'::regtype
  ) THEN
    ALTER TYPE "AccessRequestStatus" ADD VALUE 'REJECTED';
  END IF;
END $$;

-- Create enums for task visibility and approval
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'TaskVisibility'
  ) THEN
    CREATE TYPE "TaskVisibility" AS ENUM ('PRIVATE', 'PUBLIC');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'TaskApprovalStatus'
  ) THEN
    CREATE TYPE "TaskApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
  END IF;
END $$;

ALTER TABLE "Task"
  ADD COLUMN "createdById" TEXT,
  ADD COLUMN "visibility" "TaskVisibility" NOT NULL DEFAULT 'PUBLIC',
  ADD COLUMN "approvalStatus" "TaskApprovalStatus" NOT NULL DEFAULT 'APPROVED';

UPDATE "Task" SET "createdById" = "ownerId" WHERE "createdById" IS NULL;

ALTER TABLE "Task" ALTER COLUMN "createdById" SET NOT NULL;

ALTER TABLE "Task"
  ADD CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Task_createdById_idx" ON "Task"("createdById");
