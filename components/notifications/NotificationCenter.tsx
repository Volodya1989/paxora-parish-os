"use client";

import React from "react";
import NotificationBell from "@/components/notifications/NotificationBell";
import { useNotificationContext } from "@/components/notifications/NotificationProvider";

type NotificationCenterProps = {
  bellClassName?: string;
};

/**
 * A lightweight bell button that reads from NotificationProvider context.
 * Place multiple instances in the UI (sidebar, mobile bar) without duplicate polling.
 */
export function NotificationCenter({ bellClassName }: NotificationCenterProps) {
  const { count, panelOpen, togglePanel } = useNotificationContext();

  return (
    <NotificationBell
      count={count}
      onClick={togglePanel}
      aria-expanded={panelOpen}
      className={bellClassName}
    />
  );
}

export default NotificationCenter;
