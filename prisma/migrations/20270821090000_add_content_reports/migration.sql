-- Create enums for report intake and moderation workflow
CREATE TYPE "ContentReportType" AS ENUM ('CHAT_MESSAGE', 'ANNOUNCEMENT', 'GROUP_CONTENT');
CREATE TYPE "ContentReportStatus" AS ENUM ('OPEN', 'REVIEWED', 'DISMISSED');

-- Create table
CREATE TABLE "ContentReport" (
  "id" TEXT NOT NULL,
  "parishId" TEXT NOT NULL,
  "reporterUserId" TEXT NOT NULL,
  "reviewerUserId" TEXT,
  "contentType" "ContentReportType" NOT NULL,
  "contentId" TEXT NOT NULL,
  "reason" TEXT,
  "details" TEXT,
  "status" "ContentReportStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ContentReport_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "ContentReport"
  ADD CONSTRAINT "ContentReport_parishId_fkey"
  FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContentReport"
  ADD CONSTRAINT "ContentReport_reporterUserId_fkey"
  FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContentReport"
  ADD CONSTRAINT "ContentReport_reviewerUserId_fkey"
  FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Dedupe + queue indexes
CREATE UNIQUE INDEX "ContentReport_dedupe" ON "ContentReport"("parishId", "reporterUserId", "contentType", "contentId");
CREATE INDEX "ContentReport_parishId_status_createdAt_idx" ON "ContentReport"("parishId", "status", "createdAt");
CREATE INDEX "ContentReport_contentType_contentId_idx" ON "ContentReport"("contentType", "contentId");
