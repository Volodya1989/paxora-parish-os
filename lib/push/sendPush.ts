import { prisma } from "@/server/db/prisma";
import { getConfiguredWebPush, isVapidConfigured } from "./vapid";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  badge?: number;
};

/**
 * Send a push notification to all subscriptions for a given user+parish.
 * Silently removes stale subscriptions (410 Gone / 404).
 * Fire-and-forget: never throws.
 */
export async function sendPushToUser(
  userId: string,
  parishId: string,
  payload: PushPayload
): Promise<void> {
  if (!isVapidConfigured()) return;

  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId, parishId },
      select: { id: true, endpoint: true, p256dh: true, auth: true }
    });

    if (subscriptions.length === 0) return;

    const webpush = getConfiguredWebPush();
    const data = JSON.stringify(payload);

    const staleIds: string[] = [];

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth }
            },
            data,
            { TTL: 60 * 60 } // 1 hour
          );
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode;
          if (statusCode === 410 || statusCode === 404) {
            staleIds.push(sub.id);
          }
          // Log non-stale errors for observability but don't throw
          if (statusCode !== 410 && statusCode !== 404) {
            console.error(
              `[push] Failed to send to subscription ${sub.id}:`,
              statusCode ?? (error instanceof Error ? error.message : "unknown")
            );
          }
        }
      })
    );

    // Clean up stale subscriptions
    if (staleIds.length > 0) {
      await prisma.pushSubscription
        .deleteMany({ where: { id: { in: staleIds } } })
        .catch(() => {
          // Ignore cleanup errors
        });
    }
  } catch (error) {
    console.error("[push] sendPushToUser error:", error instanceof Error ? error.message : error);
  }
}

/**
 * Send push notifications to multiple users at once.
 * Fire-and-forget: never throws.
 */
export async function sendPushToUsers(
  userIds: string[],
  parishId: string,
  payload: PushPayload
): Promise<void> {
  if (!isVapidConfigured() || userIds.length === 0) return;

  await Promise.allSettled(
    userIds.map((userId) => sendPushToUser(userId, parishId, payload))
  );
}
