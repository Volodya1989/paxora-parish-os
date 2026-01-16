DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'AccessRequestStatus'
  ) THEN
    CREATE TYPE "AccessRequestStatus" AS ENUM ('PENDING', 'APPROVED');
  END IF;
END $$;

CREATE TABLE "AccessRequest" (
  "id" TEXT NOT NULL,
  "parishId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "AccessRequestStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AccessRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccessRequest_parishId_userId_key" ON "AccessRequest"("parishId", "userId");
CREATE INDEX "AccessRequest_parishId_status_idx" ON "AccessRequest"("parishId", "status");

ALTER TABLE "AccessRequest" ADD CONSTRAINT "AccessRequest_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccessRequest" ADD CONSTRAINT "AccessRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
