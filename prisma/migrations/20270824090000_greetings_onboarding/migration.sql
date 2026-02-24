-- User-level greeting onboarding + consent tracking
ALTER TABLE "User"
  ADD COLUMN "greetingsOptInAt" TIMESTAMP(3),
  ADD COLUMN "greetingsLastPromptedAt" TIMESTAMP(3),
  ADD COLUMN "greetingsDoNotAskAgain" BOOLEAN NOT NULL DEFAULT false;

-- Parish-managed templates
ALTER TABLE "Parish"
  ADD COLUMN "birthdayGreetingTemplate" TEXT,
  ADD COLUMN "anniversaryGreetingTemplate" TEXT;

CREATE TYPE "GreetingType" AS ENUM ('BIRTHDAY', 'ANNIVERSARY');

CREATE TABLE "GreetingEmailLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "parishId" TEXT NOT NULL,
  "type" "GreetingType" NOT NULL,
  "dateKey" TEXT NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "GreetingEmailLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GreetingEmailLog_userId_parishId_type_dateKey_key"
  ON "GreetingEmailLog"("userId", "parishId", "type", "dateKey");

CREATE INDEX "GreetingEmailLog_parishId_type_dateKey_idx"
  ON "GreetingEmailLog"("parishId", "type", "dateKey");

ALTER TABLE "GreetingEmailLog"
  ADD CONSTRAINT "GreetingEmailLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GreetingEmailLog"
  ADD CONSTRAINT "GreetingEmailLog_parishId_fkey"
  FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Parish-scoped greeting prompt/consent flags
ALTER TABLE "Membership"
  ADD COLUMN "allowParishGreetings" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "greetingsOptInAt" TIMESTAMP(3),
  ADD COLUMN "greetingsLastPromptedAt" TIMESTAMP(3),
  ADD COLUMN "greetingsDoNotAskAgain" BOOLEAN NOT NULL DEFAULT false;
