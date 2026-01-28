DO $$
BEGIN
  -- Task.updatedAt may not exist in some DBs
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='Task' AND column_name='updatedAt'
  ) THEN
    ALTER TABLE "Task" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;

  -- Old index names may already be renamed
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
    ALTER INDEX "email_log_join_request_unique" RENAME TO "EmailLog_joinRequestId_toEmail_key";
  END IF;
END $$;
