ALTER TABLE "Announcement" ADD COLUMN "body" TEXT;
ALTER TABLE "Announcement" ADD COLUMN "createdById" TEXT;

ALTER TABLE "Announcement"
ADD CONSTRAINT "Announcement_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
