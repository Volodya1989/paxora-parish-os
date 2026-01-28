DO $$
BEGIN
  -- If the column is camelCase
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Task' AND column_name = 'updatedAt'
  ) THEN
    EXECUTE 'ALTER TABLE "Task" ALTER COLUMN "updatedAt" DROP DEFAULT';
  END IF;

  -- If the column is snake_case
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Task' AND column_name = 'updated_at'
  ) THEN
    EXECUTE 'ALTER TABLE "Task" ALTER COLUMN "updated_at" DROP DEFAULT';
  END IF;
END $$;
