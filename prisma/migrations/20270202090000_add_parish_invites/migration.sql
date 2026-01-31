CREATE TABLE "ParishInvite" (
    "id" TEXT NOT NULL,
    "parishId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "ParishRole" NOT NULL DEFAULT 'MEMBER',
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "invitedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParishInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ParishInvite_tokenHash_key" ON "ParishInvite"("tokenHash");
CREATE INDEX "ParishInvite_parishId_email_idx" ON "ParishInvite"("parishId", "email");
CREATE INDEX "ParishInvite_expiresAt_idx" ON "ParishInvite"("expiresAt");

ALTER TABLE "ParishInvite" ADD CONSTRAINT "ParishInvite_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ParishInvite" ADD CONSTRAINT "ParishInvite_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
