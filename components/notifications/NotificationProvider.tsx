"use client";

import React, { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useNotifications } from "@/components/notifications/useNotifications";
import NotificationPanel from "@/components/notifications/NotificationPanel";
import NotificationAutoClear from "@/components/notifications/NotificationAutoClear";
import type { NotificationCategory, NotificationItem } from "@/lib/queries/notifications";

type NotificationContextValue = {
  items: NotificationItem[];
  count: number;
  loading: boolean;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  togglePanel: () => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotificationContext() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotificationContext must be used within NotificationProvider");
  }
  return ctx;
}

/**
 * Shared notification state provider.
 * Renders a single instance of the panel + auto-clear logic.
 * Multiple NotificationBell components can consume the context without duplicating polling.
 */
export function NotificationProvider({ children }: { children: ReactNode }) {
  const { items, count, loading, markCategoryRead, markAllRead } = useNotifications();
  const [panelOpen, setPanelOpen] = useState(false);

  const togglePanel = () => setPanelOpen((prev) => !prev);

  const value = useMemo(
    () => ({ items, count, loading, panelOpen, setPanelOpen, togglePanel }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, count, loading, panelOpen]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        items={items}
        onMarkAllRead={markAllRead}
        onMarkCategoryRead={markCategoryRead}
      />
      <NotificationAutoClear onMarkCategoryRead={markCategoryRead} />
    </NotificationContext.Provider>
  );
}

export default NotificationProvider;
