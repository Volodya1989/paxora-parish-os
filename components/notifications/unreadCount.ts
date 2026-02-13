import type { NotificationItem } from "@/lib/queries/notifications";

export function countUnreadItems(items: NotificationItem[]): number {
  return items.filter((item) => !item.readAt).length;
}
