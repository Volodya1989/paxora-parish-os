"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { NotificationCategory, NotificationItem } from "@/lib/queries/notifications";
import { updateAppBadge } from "@/lib/push/client/badge";
import { countUnreadItems } from "@/components/notifications/unreadCount";

type NotificationsState = {
  items: NotificationItem[];
  count: number;
  loading: boolean;
};

const POLL_INTERVAL = 60_000; // 60 seconds

export function useNotifications() {
  const [state, setState] = useState<NotificationsState>({
    items: [],
    count: 0,
    loading: true
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      const unreadCount = data.count ?? 0;
      setState({ items: data.items ?? [], count: unreadCount, loading: false });
      void updateAppBadge(unreadCount, "notifications.fetch");
      if (process.env.NODE_ENV !== "production") {
        console.debug("[notifications] fetch unreadCount", unreadCount);
      }
    } catch {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  const markCategoryRead = useCallback(
    async (category: NotificationCategory | "all") => {
      setState((prev) => {
        if (category === "all") {
          const updatedItems = prev.items.map((item) => ({
            ...item,
            readAt: item.readAt ?? new Date().toISOString()
          }));
          void updateAppBadge(0, "notifications.markAllRead.optimistic");
          if (process.env.NODE_ENV !== "production") {
            console.debug("[notifications] mark-all-read optimistic");
          }
          return { ...prev, items: updatedItems, count: 0 };
        }
        const updatedItems = prev.items.map((item) =>
          item.type === category
            ? { ...item, readAt: item.readAt ?? new Date().toISOString() }
            : item
        );
        const unreadCount = countUnreadItems(updatedItems);
        void updateAppBadge(unreadCount, "notifications.markCategoryRead.optimistic");
        return { ...prev, items: updatedItems, count: unreadCount };
      });
      try {
        await fetch("/api/notifications/mark-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category })
        });
        await fetchNotifications();
      } catch {
        // Silently fail
      }
    },
    [fetchNotifications]
  );

  const markAllRead = useCallback(() => markCategoryRead("all"), [markCategoryRead]);

  const markNotificationRead = useCallback(
    async (notificationId: string) => {
      setState((prev) => {
        const updatedItems = prev.items.map((item) =>
          item.id === notificationId
            ? { ...item, readAt: item.readAt ?? new Date().toISOString() }
            : item
        );
        const unreadCount = countUnreadItems(updatedItems);
        void updateAppBadge(unreadCount, "notifications.markOne.optimistic");
        return { ...prev, items: updatedItems, count: unreadCount };
      });
      try {
        await fetch("/api/notifications/mark-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationId })
        });
        await fetchNotifications();
      } catch {
        // Silently fail
      }
    },
    [fetchNotifications]
  );

  const deleteNotification = useCallback(
    async (notificationId: string) => {
      setState((prev) => {
        const updatedItems = prev.items.filter((item) => item.id !== notificationId);
        const unreadCount = countUnreadItems(updatedItems);
        void updateAppBadge(unreadCount, "notifications.deleteOne.optimistic");
        return { ...prev, items: updatedItems, count: unreadCount };
      });

      try {
        const response = await fetch(`/api/notifications/${notificationId}`, {
          method: "DELETE"
        });

        if (!response.ok) {
          await fetchNotifications();
          return;
        }

        await fetchNotifications();
      } catch {
        await fetchNotifications();
      }
    },
    [fetchNotifications]
  );

  useEffect(() => {
    fetchNotifications();

    intervalRef.current = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchNotifications]);

  // Refresh on tab focus (avoid stale data when user returns)
  useEffect(() => {
    const handleFocus = () => fetchNotifications();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchNotifications]);

  // Refresh immediately when other app surfaces (e.g. chat view) clear unread state.
  useEffect(() => {
    const handleRefresh = () => {
      void fetchNotifications();
    };
    window.addEventListener("notifications:refresh", handleRefresh);
    return () => window.removeEventListener("notifications:refresh", handleRefresh);
  }, [fetchNotifications]);

  return {
    items: state.items,
    count: state.count,
    loading: state.loading,
    refresh: fetchNotifications,
    markCategoryRead,
    markAllRead,
    markNotificationRead,
    deleteNotification
  };
}
