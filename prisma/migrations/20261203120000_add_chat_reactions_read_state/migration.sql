CREATE TABLE IF NOT EXISTS "ChatReaction" (
  "id" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "emoji" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ChatReaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ChatRoomReadState" (
  "id" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "lastReadAt" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ChatRoomReadState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ChatReaction_messageId_userId_emoji_key" ON "ChatReaction"("messageId", "userId", "emoji");
CREATE INDEX IF NOT EXISTS "ChatReaction_messageId_idx" ON "ChatReaction"("messageId");
CREATE INDEX IF NOT EXISTS "ChatReaction_userId_idx" ON "ChatReaction"("userId");

CREATE UNIQUE INDEX IF NOT EXISTS "ChatRoomReadState_roomId_userId_key" ON "ChatRoomReadState"("roomId", "userId");
CREATE INDEX IF NOT EXISTS "ChatRoomReadState_userId_idx" ON "ChatRoomReadState"("userId");

ALTER TABLE "ChatReaction"
  ADD CONSTRAINT "ChatReaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChatReaction"
  ADD CONSTRAINT "ChatReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChatRoomReadState"
  ADD CONSTRAINT "ChatRoomReadState_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "ChatChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChatRoomReadState"
  ADD CONSTRAINT "ChatRoomReadState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
