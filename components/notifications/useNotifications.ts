"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { NotificationCategory, NotificationItem } from "@/lib/queries/notifications";

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
      setState({ items: data.items ?? [], count: data.count ?? 0, loading: false });
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
          return { ...prev, items: updatedItems, count: 0 };
        }
        const updatedItems = prev.items.map((item) =>
          item.type === category
            ? { ...item, readAt: item.readAt ?? new Date().toISOString() }
            : item
        );
        const unreadCount = updatedItems.filter((item) => !item.readAt).length;
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
        const unreadCount = updatedItems.filter((item) => !item.readAt).length;
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

  return {
    items: state.items,
    count: state.count,
    loading: state.loading,
    refresh: fetchNotifications,
    markCategoryRead,
    markAllRead,
    markNotificationRead
  };
}
