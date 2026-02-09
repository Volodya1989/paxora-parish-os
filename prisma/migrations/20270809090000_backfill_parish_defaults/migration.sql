-- Backfill NULL timezone / defaultLocale on parishes created before
-- the platform-admin migration applied NOT NULL constraints.
UPDATE "Parish" SET "timezone" = 'UTC' WHERE "timezone" IS NULL;
UPDATE "Parish" SET "defaultLocale" = 'en' WHERE "defaultLocale" IS NULL;

-- Ensure NOT NULL + DEFAULT constraints are in place
ALTER TABLE "Parish"
  ALTER COLUMN "timezone" SET NOT NULL,
  ALTER COLUMN "timezone" SET DEFAULT 'UTC',
  ALTER COLUMN "defaultLocale" SET NOT NULL,
  ALTER COLUMN "defaultLocale" SET DEFAULT 'en';
