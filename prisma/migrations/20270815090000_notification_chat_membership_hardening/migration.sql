ALTER TABLE "Notification"
  ADD COLUMN "chatChannelId" TEXT;

CREATE INDEX "Notification_chatChannelId_idx" ON "Notification"("chatChannelId");

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_chatChannelId_fkey"
  FOREIGN KEY ("chatChannelId") REFERENCES "ChatChannel"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Cleanup leaked message notifications: remove rows that reference channels
-- where the recipient is not currently eligible to receive chat notifications.
DELETE FROM "Notification" n
WHERE n."type" IN ('MESSAGE', 'MENTION')
  AND COALESCE(n."chatChannelId", substring(n."href" FROM 'channel=([^&]+)')) IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM "ChatChannel" c
    WHERE c."id" = COALESCE(n."chatChannelId", substring(n."href" FROM 'channel=([^&]+)'))
      AND c."parishId" = n."parishId"
  )
  AND NOT EXISTS (
    SELECT 1
    FROM "ChatChannel" c
    LEFT JOIN "GroupMembership" gm
      ON c."groupId" = gm."groupId"
      AND gm."userId" = n."userId"
      AND gm."status" = 'ACTIVE'
    LEFT JOIN "ChatChannelMembership" cm
      ON c."id" = cm."channelId"
      AND cm."userId" = n."userId"
    LEFT JOIN "Membership" pm
      ON c."parishId" = pm."parishId"
      AND pm."userId" = n."userId"
    WHERE c."id" = COALESCE(n."chatChannelId", substring(n."href" FROM 'channel=([^&]+)'))
      AND (
        (c."type" = 'GROUP' AND gm."id" IS NOT NULL)
        OR (
          c."type" <> 'GROUP'
          AND (
            cm."id" IS NOT NULL
            OR (
              pm."id" IS NOT NULL
              AND NOT EXISTS (
                SELECT 1
                FROM "ChatChannelMembership" cm2
                WHERE cm2."channelId" = c."id"
              )
            )
          )
        )
      )
  );
