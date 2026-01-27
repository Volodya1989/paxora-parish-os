-- no-op migration:
-- Previous attempt renamed EmailLog indexes, but that breaks shadow DB because the
-- indexes may not exist yet during a clean migration replay.
-- We keep the original Prisma index names to match schema.prisma.

DO $$
BEGIN
  -- If a previous environment applied the rename, clean up to enforce canonical names.
  -- Keep "email_log_digest_unique" (used by schema @@unique name).
  IF to_regclass('public."EmailLog_parishId_weekId_userId_type_key"') IS NOT NULL
     AND to_regclass('public.email_log_digest_unique') IS NOT NULL THEN
    DROP INDEX public."EmailLog_parishId_weekId_userId_type_key";
  END IF;

  -- Keep "email_log_join_request_unique" (if you have this unique in schema / past migrations).
  IF to_regclass('public."EmailLog_joinRequestId_toEmail_type_key"') IS NOT NULL
     AND to_regclass('public.email_log_join_request_unique') IS NOT NULL THEN
    DROP INDEX public."EmailLog_joinRequestId_toEmail_type_key";
  END IF;
END $$;
