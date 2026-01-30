DO $$
BEGIN
  -- digest unique: old -> new
  IF to_regclass('"email_log_digest_unique"') IS NOT NULL THEN
    ALTER INDEX "email_log_digest_unique"
      RENAME TO "EmailLog_parishId_weekId_userId_type_key";
  END IF;

  -- join request unique: old -> new
  IF to_regclass('"email_log_join_request_unique"') IS NOT NULL THEN
    ALTER INDEX "email_log_join_request_unique"
      RENAME TO "EmailLog_joinRequestId_toEmail_type_key";
  END IF;

  -- fix the wrong name produced by threads migration (if it exists)
  IF to_regclass('"EmailLog_joinRequestId_toEmail_key"') IS NOT NULL THEN
    ALTER INDEX "EmailLog_joinRequestId_toEmail_key"
      RENAME TO "EmailLog_joinRequestId_toEmail_type_key";
  END IF;
END $$;
