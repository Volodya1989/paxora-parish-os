import { prisma } from "@/server/db/prisma";
import { recordDeliveryAttempt, toDeliveryTarget } from "@/lib/ops/deliveryAttempts";
import { getConfiguredWebPush, isVapidConfigured } from "./vapid";
import { getNotificationUnreadCount } from "@/lib/queries/notifications";

export type PushCategory = "message" | "task" | "announcement" | "event" | "request" | "other";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  badge?: number;
  /** Push notification category for per-type user preference gating */
  category?: PushCategory;
};

/** Maps a push category to the User model field that gates it */
const PUSH_PREF_FIELD: Record<Exclude<PushCategory, "other">, string> = {
  message: "notifyMessagePush",
  task: "notifyTaskPush",
  announcement: "notifyAnnouncementPush",
  event: "notifyEventPush",
  request: "notifyRequestPush"
};

/**
 * Send a push notification to all subscriptions for a given user+parish.
 * Respects per-category push preferences on the User model.
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
    // Check per-category push preference
    const category = payload.category;
    if (category && category !== "other") {
      const prefField = PUSH_PREF_FIELD[category];
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { [prefField]: true }
      });
      if (user && (user as Record<string, unknown>)[prefField] === false) return;
    }

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId, parishId },
      select: { id: true, endpoint: true, p256dh: true, auth: true }
    });

    if (subscriptions.length === 0) return;

    const webpush = getConfiguredWebPush();
    const unreadCount = await getNotificationUnreadCount(userId, parishId);
    const data = JSON.stringify({ ...payload, badge: unreadCount });

    if (process.env.NODE_ENV !== "production") {
      console.debug("[push] payload badge", { userId, parishId, unreadCount, tag: payload.tag ?? "push" });
    }

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
          await recordDeliveryAttempt({
            channel: "PUSH",
            status: "SUCCESS",
            parishId,
            userId,
            target: toDeliveryTarget("PUSH", sub.endpoint),
            template: payload.tag ?? "push",
            context: {
              title: payload.title,
              url: payload.url ?? null
            }
          });
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode;
          const message = error instanceof Error ? error.message : "Unknown push error";
          if (statusCode === 410 || statusCode === 404) {
            staleIds.push(sub.id);
          }
          await recordDeliveryAttempt({
            channel: "PUSH",
            status: "FAILURE",
            parishId,
            userId,
            target: toDeliveryTarget("PUSH", sub.endpoint),
            template: payload.tag ?? "push",
            context: {
              title: payload.title,
              url: payload.url ?? null
            },
            errorCode: statusCode ? String(statusCode) : null,
            errorMessage: message
          });
          // Log non-stale errors for observability but don't throw
          if (statusCode !== 410 && statusCode !== 404) {
            console.error(
              `[push] Failed to send to subscription ${sub.id}:`,
              statusCode ?? message
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
