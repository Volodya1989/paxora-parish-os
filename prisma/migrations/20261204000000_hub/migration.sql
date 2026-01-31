-- AlterTable
ALTER TABLE "ChatRoomReadState" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Task" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- RenameIndex (safe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i'
      AND c.relname = 'email_log_digest_unique'
      AND n.nspname = 'public'
  ) THEN
    ALTER INDEX "email_log_digest_unique" RENAME TO "EmailLog_parishId_weekId_userId_type_key";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i'
      AND c.relname = 'email_log_join_request_unique'
      AND n.nspname = 'public'
  ) THEN
    ALTER INDEX "email_log_join_request_unique" RENAME TO "EmailLog_joinRequestId_toEmail_type_key";
  END IF;
END $$;
