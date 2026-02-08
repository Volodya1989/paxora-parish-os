"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { stripLocale } from "@/lib/i18n/routing";
import type { NotificationCategory } from "@/lib/queries/notifications";

type NotificationAutoClearProps = {
  onMarkCategoryRead: (category: NotificationCategory) => void;
};

/**
 * Watches pathname changes and auto-clears the relevant notification category
 * when the user navigates to the content area:
 *  - /tasks → clears task notifications
 *  - /announcements → clears announcement notifications
 *  - /calendar → clears event notifications
 *  - /community/chat → clears message notifications (handled by existing markRoomRead)
 */
export function NotificationAutoClear({ onMarkCategoryRead }: NotificationAutoClearProps) {
  const pathname = usePathname();
  const prevPathRef = useRef<string>("");

  useEffect(() => {
    const normalized = stripLocale(pathname);

    // Only fire when the path actually changes
    if (normalized === prevPathRef.current) return;
    prevPathRef.current = normalized;

    if (normalized.startsWith("/tasks")) {
      onMarkCategoryRead("task");
    } else if (normalized.startsWith("/announcements")) {
      onMarkCategoryRead("announcement");
    } else if (normalized.startsWith("/calendar")) {
      onMarkCategoryRead("event");
    } else if (normalized.startsWith("/requests") || normalized.startsWith("/admin/requests")) {
      onMarkCategoryRead("request");
    }
    // Chat auto-clear is handled by the existing markRoomRead server action
    // when the user opens a specific channel, so we don't need to handle it here.
  }, [pathname, onMarkCategoryRead]);

  return null;
}

export default NotificationAutoClear;
