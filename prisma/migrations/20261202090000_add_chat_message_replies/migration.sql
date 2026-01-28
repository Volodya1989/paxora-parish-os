ALTER TABLE "ChatMessage"
  ADD COLUMN IF NOT EXISTS "parentMessageId" TEXT,
  ADD COLUMN IF NOT EXISTS "editedAt" TIMESTAMP(3);

ALTER TABLE "ChatMessage"
  ADD CONSTRAINT "ChatMessage_parentMessageId_fkey" FOREIGN KEY ("parentMessageId") REFERENCES "ChatMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "ChatMessage_parentMessageId_idx" ON "ChatMessage"("parentMessageId");
