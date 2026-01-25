DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'EmailType'
  ) THEN
    CREATE TYPE "EmailType" AS ENUM ('TRANSACTIONAL', 'NOTIFICATION', 'DIGEST');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'EmailStatus'
  ) THEN
    CREATE TYPE "EmailStatus" AS ENUM ('SENT', 'FAILED', 'SKIPPED');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'ParishEmailDomainStatus'
  ) THEN
    CREATE TYPE "ParishEmailDomainStatus" AS ENUM ('DEFAULT', 'PENDING', 'VERIFIED', 'FAILED');
  END IF;
END $$;

ALTER TABLE "Parish"
  ADD COLUMN IF NOT EXISTS "emailFromName" TEXT,
  ADD COLUMN IF NOT EXISTS "emailFromAddress" TEXT,
  ADD COLUMN IF NOT EXISTS "emailReplyTo" TEXT,
  ADD COLUMN IF NOT EXISTS "emailDomainStatus" "ParishEmailDomainStatus" NOT NULL DEFAULT 'DEFAULT';

ALTER TABLE "Membership"
  ADD COLUMN IF NOT EXISTS "notifyEmailEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "weeklyDigestEnabled" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "EmailLog" (
  "id" TEXT NOT NULL,
  "type" "EmailType" NOT NULL,
  "template" TEXT NOT NULL,
  "toEmail" TEXT NOT NULL,
  "userId" TEXT,
  "parishId" TEXT,
  "weekId" TEXT,
  "joinRequestId" TEXT,
  "status" "EmailStatus" NOT NULL,
  "error" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EmailLog_userId_idx" ON "EmailLog"("userId");
CREATE INDEX IF NOT EXISTS "EmailLog_parishId_idx" ON "EmailLog"("parishId");
CREATE INDEX IF NOT EXISTS "EmailLog_weekId_idx" ON "EmailLog"("weekId");
CREATE INDEX IF NOT EXISTS "EmailLog_joinRequestId_idx" ON "EmailLog"("joinRequestId");

CREATE UNIQUE INDEX IF NOT EXISTS "email_log_digest_unique" ON "EmailLog"("parishId", "weekId", "userId", "type");
CREATE UNIQUE INDEX IF NOT EXISTS "email_log_join_request_unique" ON "EmailLog"("joinRequestId", "toEmail", "type");

ALTER TABLE "EmailLog"
  ADD CONSTRAINT "EmailLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmailLog"
  ADD CONSTRAINT "EmailLog_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmailLog"
  ADD CONSTRAINT "EmailLog_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "Week"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmailLog"
  ADD CONSTRAINT "EmailLog_joinRequestId_fkey" FOREIGN KEY ("joinRequestId") REFERENCES "AccessRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_expiresAt_idx" ON "PasswordResetToken"("userId", "expiresAt");

ALTER TABLE "PasswordResetToken"
  ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
