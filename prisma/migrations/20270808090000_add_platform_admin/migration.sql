CREATE TYPE "PlatformRole" AS ENUM ('SUPERADMIN');

CREATE TYPE "AuditAction" AS ENUM ('IMPERSONATION_START', 'IMPERSONATION_END');

ALTER TABLE "Parish" ADD COLUMN "address" TEXT;
ALTER TABLE "Parish" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'UTC';
ALTER TABLE "Parish" ADD COLUMN "logoUrl" TEXT;
ALTER TABLE "Parish" ADD COLUMN "defaultLocale" TEXT NOT NULL DEFAULT 'en';

ALTER TABLE "User" ADD COLUMN "impersonatedParishId" TEXT;
ALTER TABLE "User" ADD COLUMN "platformRole" "PlatformRole";

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "targetParishId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");
CREATE INDEX "AuditLog_targetParishId_createdAt_idx" ON "AuditLog"("targetParishId", "createdAt");

ALTER TABLE "User" ADD CONSTRAINT "User_impersonatedParishId_fkey" FOREIGN KEY ("impersonatedParishId") REFERENCES "Parish"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_targetParishId_fkey" FOREIGN KEY ("targetParishId") REFERENCES "Parish"("id") ON DELETE CASCADE ON UPDATE CASCADE;
