ALTER TABLE "Parish"
ADD COLUMN "inviteCode" TEXT,
ADD COLUMN "inviteCodeCreatedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Parish_inviteCode_key" ON "Parish"("inviteCode");

CREATE OR REPLACE FUNCTION generate_parish_invite_code(code_length integer DEFAULT 7)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  output text := '';
  idx integer;
BEGIN
  FOR idx IN 1..code_length LOOP
    output := output || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN output;
END;
$$;

DO $$
DECLARE
  parish_record record;
  candidate text;
BEGIN
  FOR parish_record IN SELECT id FROM "Parish" WHERE "inviteCode" IS NULL LOOP
    LOOP
      candidate := generate_parish_invite_code(7);
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM "Parish" WHERE "inviteCode" = candidate
      );
    END LOOP;

    UPDATE "Parish"
    SET "inviteCode" = candidate,
        "inviteCodeCreatedAt" = COALESCE("inviteCodeCreatedAt", NOW())
    WHERE id = parish_record.id;
  END LOOP;
END;
$$;

DROP FUNCTION generate_parish_invite_code(integer);
