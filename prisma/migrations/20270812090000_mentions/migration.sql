-- CreateEnum
CREATE TYPE "MentionContextType" AS ENUM ('CHAT_MESSAGE', 'TASK_COMMENT');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'MENTION';

-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN "mentionEntities" JSONB;
ALTER TABLE "TaskComment" ADD COLUMN "mentionEntities" JSONB;

-- CreateTable
CREATE TABLE "Mention" (
    "id" TEXT NOT NULL,
    "parishId" TEXT NOT NULL,
    "mentionedUserId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "contextType" "MentionContextType" NOT NULL,
    "contextId" TEXT NOT NULL,
    "snippet" TEXT,
    "href" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mention_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Mention_mentionedUserId_parishId_createdAt_idx" ON "Mention"("mentionedUserId", "parishId", "createdAt");
CREATE INDEX "Mention_contextType_contextId_idx" ON "Mention"("contextType", "contextId");

-- AddForeignKey
ALTER TABLE "Mention" ADD CONSTRAINT "Mention_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Mention" ADD CONSTRAINT "Mention_mentionedUserId_fkey" FOREIGN KEY ("mentionedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Mention" ADD CONSTRAINT "Mention_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
