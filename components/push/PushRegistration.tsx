"use client";

import { useEffect } from "react";
import { registerServiceWorker, refreshBadge } from "@/lib/push/client/register";

/**
 * Invisible component that:
 * 1. Registers the service worker on mount
 * 2. Refreshes the home screen badge count on app open / focus
 *
 * Drop this into the app shell layout.
 */
export default function PushRegistration() {
  useEffect(() => {
    registerServiceWorker();

    // Refresh badge on initial load
    refreshBadge();

    // Refresh badge when the app returns to foreground
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        refreshBadge();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}
