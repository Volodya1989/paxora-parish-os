-- RenameIndex (safe / idempotent)
DO $$
BEGIN
  IF to_regclass('public.email_log_digest_unique') IS NOT NULL THEN
    ALTER INDEX public.email_log_digest_unique
      RENAME TO "EmailLog_parishId_weekId_userId_type_key";
  END IF;
END $$;

-- RenameIndex (safe / idempotent)
DO $$
BEGIN
  IF to_regclass('public.email_log_join_request_unique') IS NOT NULL THEN
    ALTER INDEX public.email_log_join_request_unique
      RENAME TO "EmailLog_joinRequestId_toEmail_type_key";
  END IF;
END $$;
