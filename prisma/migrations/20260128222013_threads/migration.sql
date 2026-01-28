-- AlterTable
ALTER TABLE "Task" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- RenameIndex
ALTER INDEX "email_log_digest_unique" RENAME TO "EmailLog_parishId_weekId_userId_type_key";

-- RenameIndex
ALTER INDEX "email_log_join_request_unique" RENAME TO "EmailLog_joinRequestId_toEmail_type_key";
