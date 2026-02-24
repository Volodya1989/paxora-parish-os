-- Parish-level toggle to enable/disable greeting emails
ALTER TABLE "Parish"
  ADD COLUMN "greetingsEnabled" BOOLEAN NOT NULL DEFAULT true;
