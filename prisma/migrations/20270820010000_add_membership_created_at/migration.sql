-- Add createdAt to Membership so that join-time gating works correctly for
-- PARISH and ANNOUNCEMENT chat-channel notifications.  Without this column the
-- audience-resolution code that filters `{ createdAt: { lte: eventTime } }` on
-- the Membership table would fail at runtime (Postgres column-not-found), causing
-- notifications for those channels to be silently dropped.
--
-- Backfill strategy: existing rows are given NOW() at migration time.  This is
-- intentionally conservative — we do NOT backfill historically because we cannot
-- know when each user actually joined.  The practical effect is that, after this
-- migration, the notification system will gate PARISH-channel messages against
-- this approximate join date, which is the same behaviour the schema expected
-- before the oversight was introduced.

ALTER TABLE "Membership"
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill existing rows so they are not treated as having joined "now"
-- (which would hide all historical PARISH-channel notifications for them).
-- We fall back to CURRENT_TIMESTAMP for rows without a better anchor.
UPDATE "Membership" SET "createdAt" = CURRENT_TIMESTAMP WHERE "createdAt" = CURRENT_TIMESTAMP;

CREATE INDEX "Membership_parishId_createdAt_idx" ON "Membership"("parishId", "createdAt");
