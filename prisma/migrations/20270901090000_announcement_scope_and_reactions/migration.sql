-- CreateEnum
CREATE TYPE "AnnouncementScopeType" AS ENUM ('PARISH', 'CHAT');

-- AlterTable
ALTER TABLE "Announcement"
ADD COLUMN "scopeType" "AnnouncementScopeType" NOT NULL DEFAULT 'PARISH',
ADD COLUMN "chatChannelId" TEXT;

-- CreateTable
CREATE TABLE "AnnouncementReaction" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Announcement_parishId_scopeType_idx" ON "Announcement"("parishId", "scopeType");
CREATE INDEX "Announcement_chatChannelId_idx" ON "Announcement"("chatChannelId");
CREATE UNIQUE INDEX "AnnouncementReaction_announcementId_userId_emoji_key" ON "AnnouncementReaction"("announcementId", "userId", "emoji");
CREATE INDEX "AnnouncementReaction_announcementId_idx" ON "AnnouncementReaction"("announcementId");
CREATE INDEX "AnnouncementReaction_userId_idx" ON "AnnouncementReaction"("userId");

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_chatChannelId_fkey" FOREIGN KEY ("chatChannelId") REFERENCES "ChatChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnnouncementReaction" ADD CONSTRAINT "AnnouncementReaction_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnnouncementReaction" ADD CONSTRAINT "AnnouncementReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
