-- CreateEnum (idempotent)
DO $$ BEGIN
  CREATE TYPE "PlatformRole" AS ENUM ('SUPERADMIN');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AuditAction" AS ENUM ('IMPERSONATION_START', 'IMPERSONATION_END');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Parish columns (idempotent)
ALTER TABLE "Parish"
  ADD COLUMN IF NOT EXISTS "address" TEXT,
  ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS "logoUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "defaultLocale" TEXT NOT NULL DEFAULT 'en';

-- User columns (idempotent)
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "impersonatedParishId" TEXT,
  ADD COLUMN IF NOT EXISTS "platformRole" "PlatformRole";

-- AuditLog table (idempotent)
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "targetParishId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_targetParishId_createdAt_idx" ON "AuditLog"("targetParishId", "createdAt");

-- Foreign keys (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_impersonatedParishId_fkey') THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_impersonatedParishId_fkey" FOREIGN KEY ("impersonatedParishId") REFERENCES "Parish"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AuditLog_actorUserId_fkey') THEN
    ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AuditLog_targetParishId_fkey') THEN
    ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_targetParishId_fkey" FOREIGN KEY ("targetParishId") REFERENCES "Parish"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
