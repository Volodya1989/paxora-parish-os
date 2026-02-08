"use client";

import React, { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { useNotifications } from "@/components/notifications/useNotifications";
import NotificationPanel from "@/components/notifications/NotificationPanel";
import NotificationAutoClear from "@/components/notifications/NotificationAutoClear";
import type { NotificationItem } from "@/lib/queries/notifications";

type NotificationContextValue = {
  items: NotificationItem[];
  count: number;
  loading: boolean;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  togglePanel: () => void;
};

const defaultValue: NotificationContextValue = {
  items: [],
  count: 0,
  loading: false,
  panelOpen: false,
  setPanelOpen: () => {},
  togglePanel: () => {}
};

const NotificationContext = createContext<NotificationContextValue>(defaultValue);

/**
 * Returns notification context. Safe to call outside NotificationProvider --
 * returns a no-op default so components (e.g. Sidebar) render in tests without
 * requiring the full provider tree.
 */
export function useNotificationContext() {
  return useContext(NotificationContext);
}

/**
 * Shared notification state provider.
 * Renders a single instance of the panel + auto-clear logic.
 * Multiple NotificationBell components can consume the context without duplicating polling.
 */
export function NotificationProvider({ children }: { children: ReactNode }) {
  const { items, count, loading, markCategoryRead, markAllRead } = useNotifications();
  const [panelOpen, setPanelOpen] = useState(false);
  const hadItemsRef = useRef(false);

  const handleClose = useCallback(() => {
    // Auto-mark all as read when closing the panel if there were items to see
    if (hadItemsRef.current) {
      markAllRead();
      hadItemsRef.current = false;
    }
    setPanelOpen(false);
  }, [markAllRead]);

  const togglePanel = useCallback(() => {
    setPanelOpen((prev) => {
      const next = !prev;
      if (next && count > 0) {
        hadItemsRef.current = true;
      }
      return next;
    });
  }, [count]);

  const value = useMemo(
    () => ({ items, count, loading, panelOpen, setPanelOpen, togglePanel }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, count, loading, panelOpen, togglePanel]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationPanel
        open={panelOpen}
        onClose={handleClose}
        items={items}
        onMarkAllRead={markAllRead}
        onMarkCategoryRead={markCategoryRead}
      />
      <NotificationAutoClear onMarkCategoryRead={markCategoryRead} />
    </NotificationContext.Provider>
  );
}

export default NotificationProvider;
