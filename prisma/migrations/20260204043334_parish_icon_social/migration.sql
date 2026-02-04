-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.

-- SAFETY: Ensure the enum exists in DB (some environments may not have it yet).
-- We create it with the "base" values (the ones that existed BEFORE this migration).
-- Then we add the new values one-by-one, ignoring duplicates.

DO $$ BEGIN
  CREATE TYPE "ParishIcon" AS ENUM (
    'BULLETIN',
    'MASS_TIMES',
    'CONFESSION',
    'WEBSITE',
    'CALENDAR',
    'READINGS',
    'GIVING',
    'CONTACT'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "ParishIcon" ADD VALUE 'FACEBOOK';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "ParishIcon" ADD VALUE 'YOUTUBE';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "ParishIcon" ADD VALUE 'PRAYER';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "ParishIcon" ADD VALUE 'NEWS';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
