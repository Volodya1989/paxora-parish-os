"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import EngagementModal from "@/components/pwa/EngagementModal";
import { subscribeToPush } from "@/lib/push/client/register";
import {
  BeforeInstallPromptEvent,
  canShowInstallCTA,
  isIOSDevice,
  isRunningStandalone,
  requestNotificationPermission,
  setDeferredPrompt,
  triggerInstallPrompt
} from "@/lib/pwa";
import {
  getEngagementRouteKey,
  incrementSessionCount,
  markInstalledAt,
  markPromptDismissed,
  markPromptNeverAskAgain,
  markPromptShown,
  recordRouteVisit,
  shouldShowA2HS,
  shouldShowNotifications
} from "@/lib/pwa/engagement";

export default function EngagementPrompts() {
  const pathname = usePathname();
  const [sessionCount, setSessionCount] = useState(0);
  const [isStandalone, setIsStandalone] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">(
    "default"
  );
  const [installAvailable, setInstallAvailable] = useState(false);
  const [a2hsOpen, setA2hsOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [highIntent, setHighIntent] = useState(false);
  const [installBusy, setInstallBusy] = useState(false);
  const [notifBusy, setNotifBusy] = useState(false);

  const isIOS = useMemo(() => isIOSDevice(), []);

  useEffect(() => {
    setSessionCount(incrementSessionCount());
    setIsStandalone(isRunningStandalone());
    setInstallAvailable(canShowInstallCTA());

    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    } else {
      setNotificationPermission("unsupported");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setInstallAvailable(true);
    };

    const handleAppInstalled = () => {
      markInstalledAt();
      setA2hsOpen(false);
      // Do not set isStandalone here — the user is still in the browser tab.
      // isRunningStandalone() will return true on the next launch from the
      // home screen, which is when we should prompt for notifications.
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (!pathname) {
      return;
    }

    const routeKey = getEngagementRouteKey(pathname);
    if (!routeKey) {
      return;
    }

    const count = recordRouteVisit(routeKey);
    if (count >= 2) {
      setHighIntent(true);
    }
  }, [pathname]);

  useEffect(() => {
    if (!sessionCount || a2hsOpen || notifOpen) {
      return;
    }

    if (shouldShowA2HS(sessionCount, isStandalone)) {
      setA2hsOpen(true);
      markPromptShown("a2hs", sessionCount);
    }
  }, [a2hsOpen, isStandalone, notifOpen, sessionCount]);

  useEffect(() => {
    if (!sessionCount || a2hsOpen || notifOpen) {
      return;
    }

    if (
      shouldShowNotifications({
        sessionCount,
        isStandalone,
        permission: notificationPermission,
        highIntent
      })
    ) {
      setNotifOpen(true);
      markPromptShown("notifications", sessionCount);
    }
  }, [a2hsOpen, highIntent, isStandalone, notifOpen, notificationPermission, sessionCount]);

  const closeA2hs = () => {
    setA2hsOpen(false);
    setShowInstructions(false);
    markPromptDismissed("a2hs");
  };

  const handleA2hsPrimary = async () => {
    if (installBusy) {
      return;
    }
    if (installAvailable) {
      setInstallBusy(true);
      try {
        await triggerInstallPrompt();
      } finally {
        setInstallBusy(false);
        setInstallAvailable(canShowInstallCTA());
        closeA2hs();
      }
      return;
    }

    if (showInstructions) {
      closeA2hs();
      return;
    }

    setShowInstructions(true);
  };

  const handleNotificationsPrimary = async () => {
    if (notifBusy) {
      return;
    }
    setNotifBusy(true);
    try {
      const permission = await requestNotificationPermission();
      setNotificationPermission(permission);

      if (permission === "granted") {
        await subscribeToPush();
        setNotifOpen(false);
        return;
      }

      markPromptDismissed("notifications");
      setNotifOpen(false);
    } finally {
      setNotifBusy(false);
    }
  };

  const handleNotificationsSecondary = () => {
    setNotifOpen(false);
    markPromptDismissed("notifications");
  };

  const handleNotificationsNeverAsk = () => {
    markPromptNeverAskAgain();
    setNotifOpen(false);
  };

  const a2hsPrimaryLabel = installAvailable
    ? installBusy
      ? "Installing..."
      : "Install"
    : showInstructions
      ? "Got it"
      : "How to add";

  const a2hsDescription =
    "Install Paxora for a faster, app-like experience and more reliable notifications.";

  const a2hsBody = showInstructions ? (
    <div className="space-y-3">
      <p className="text-sm text-ink-600">
        {isIOS
          ? "On iPhone or iPad, installation happens from the Share menu in Safari."
          : "On Android and desktop Chrome, install from the browser menu."}
      </p>
      <ol className="list-decimal space-y-2 pl-5 text-sm text-ink-700">
        {isIOS ? (
          <>
            <li>Open Paxora in Safari.</li>
            <li>Tap the Share icon.</li>
            <li>Select “Add to Home Screen”.</li>
            <li>Launch Paxora from your home screen.</li>
          </>
        ) : (
          <>
            <li>Open the browser menu (⋮ or ⋯).</li>
            <li>Select “Install app” or “Add to Home screen”.</li>
            <li>Confirm to add Paxora.</li>
          </>
        )}
      </ol>
    </div>
  ) : (
    <p className="text-sm text-ink-600">
      You’ll get a smoother experience and the ability to turn on notifications once installed.
    </p>
  );

  const notifDescription = "Want alerts for announcements, schedule changes, and requests?";
  const notifBody = (
    <p className="text-sm text-ink-600">
      You can manage push notifications anytime in Settings.
    </p>
  );

  return (
    <>
      <EngagementModal
        open={a2hsOpen}
        variant="a2hs"
        title="Add Paxora to your Home Screen"
        description={a2hsDescription}
        body={a2hsBody}
        primaryLabel={a2hsPrimaryLabel}
        secondaryLabel="Not now"
        onPrimary={handleA2hsPrimary}
        onSecondary={closeA2hs}
        onClose={closeA2hs}
      />
      <EngagementModal
        open={notifOpen}
        variant="notifications"
        title="Enable notifications"
        description={notifDescription}
        body={notifBody}
        primaryLabel={notifBusy ? "Enabling..." : "Enable notifications"}
        secondaryLabel="Not now"
        tertiaryLabel="Don’t ask again"
        onPrimary={handleNotificationsPrimary}
        onSecondary={handleNotificationsSecondary}
        onTertiary={handleNotificationsNeverAsk}
        onClose={handleNotificationsSecondary}
      />
    </>
  );
}
