-- CreateEnum
CREATE TYPE "ChatChannelType" AS ENUM ('ANNOUNCEMENT', 'GROUP', 'PARISH');

-- CreateEnum
CREATE TYPE "ChatChannelMembershipRole" AS ENUM ('MEMBER', 'MODERATOR');

-- AlterTable
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='Task' AND column_name='updatedAt'
  ) THEN
    ALTER TABLE "Task" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;
END $$;

-- CreateTable
CREATE TABLE "ChatChannel" (
    "id" TEXT NOT NULL,
    "parishId" TEXT NOT NULL,
    "groupId" TEXT,
    "type" "ChatChannelType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatChannelMembership" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ChatChannelMembershipRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatChannelMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatPinnedMessage" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "pinnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pinnedById" TEXT NOT NULL,

    CONSTRAINT "ChatPinnedMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatChannel_parishId_idx" ON "ChatChannel"("parishId");

-- CreateIndex
CREATE INDEX "ChatMessage_channelId_createdAt_id_idx" ON "ChatMessage"("channelId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "ChatChannelMembership_userId_idx" ON "ChatChannelMembership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatChannelMembership_channelId_userId_key" ON "ChatChannelMembership"("channelId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatPinnedMessage_channelId_key" ON "ChatPinnedMessage"("channelId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatPinnedMessage_messageId_key" ON "ChatPinnedMessage"("messageId");

-- AddForeignKey
ALTER TABLE "ChatChannel" ADD CONSTRAINT "ChatChannel_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatChannel" ADD CONSTRAINT "ChatChannel_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "ChatChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatChannelMembership" ADD CONSTRAINT "ChatChannelMembership_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "ChatChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatChannelMembership" ADD CONSTRAINT "ChatChannelMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatPinnedMessage" ADD CONSTRAINT "ChatPinnedMessage_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "ChatChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatPinnedMessage" ADD CONSTRAINT "ChatPinnedMessage_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatPinnedMessage" ADD CONSTRAINT "ChatPinnedMessage_pinnedById_fkey" FOREIGN KEY ("pinnedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relkind='i' AND c.relname='email_log_digest_unique'
  ) THEN
    ALTER INDEX "email_log_digest_unique" RENAME TO "EmailLog_parishId_weekId_userId_type_key";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relkind='i' AND c.relname='email_log_join_request_unique'
  ) THEN
    ALTER INDEX "email_log_join_request_unique" RENAME TO "EmailLog_joinRequestId_toEmail_type_key";
  END IF;
END $$;
