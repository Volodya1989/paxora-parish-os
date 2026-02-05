-- AlterEnum
ALTER TYPE "EmailType" ADD VALUE 'ANNOUNCEMENT';

-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN "bodyHtml" TEXT,
ADD COLUMN "bodyText" TEXT,
ADD COLUMN "audienceUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "EmailLog" ADD COLUMN "announcementId" TEXT;

-- CreateIndex
CREATE INDEX "EmailLog_announcementId_idx" ON "EmailLog"("announcementId");

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
