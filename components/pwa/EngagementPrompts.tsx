"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "@/lib/i18n/provider";
import EngagementModal from "@/components/pwa/EngagementModal";
import { getClientShellContext } from "@/lib/monitoring/sentry-shell-context";
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
  const t = useTranslations();
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
  const [isNativeWrapper, setIsNativeWrapper] = useState(false);

  const isIOS = useMemo(() => isIOSDevice(), []);

  useEffect(() => {
    const shellContext = getClientShellContext();
    const nativeWrapper = shellContext.shell === "native_wrapper";

    setSessionCount(incrementSessionCount());
    setIsNativeWrapper(nativeWrapper);
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
    if (isNativeWrapper || !sessionCount || a2hsOpen || notifOpen) {
      return;
    }

    if (shouldShowA2HS(sessionCount, isStandalone)) {
      setA2hsOpen(true);
      markPromptShown("a2hs", sessionCount);
    }
  }, [a2hsOpen, isNativeWrapper, isStandalone, notifOpen, sessionCount]);

  useEffect(() => {
    if (isNativeWrapper || !sessionCount || a2hsOpen || notifOpen) {
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
  }, [a2hsOpen, highIntent, isNativeWrapper, isStandalone, notifOpen, notificationPermission, sessionCount]);

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
      ? t("pwa.installing")
      : t("pwa.install")
    : showInstructions
      ? t("pwa.gotIt")
      : t("pwa.howToAdd");

  const a2hsDescription = t("pwa.addToHomeScreen.description");

  const a2hsBody = showInstructions ? (
    <div className="space-y-3">
      <p className="text-sm text-ink-600">
        {isIOS
          ? t("pwa.addToHomeScreen.iosHint")
          : t("pwa.addToHomeScreen.otherHint")}
      </p>
      <ol className="list-decimal space-y-2 pl-5 text-sm text-ink-700">
        {isIOS ? (
          <>
            <li>{t("pwa.addToHomeScreen.iosSteps.openSafari")}</li>
            <li>{t("pwa.addToHomeScreen.iosSteps.tapShare")}</li>
            <li>{t("pwa.addToHomeScreen.iosSteps.selectAdd")}</li>
            <li>{t("pwa.addToHomeScreen.iosSteps.launch")}</li>
          </>
        ) : (
          <>
            <li>{t("pwa.addToHomeScreen.otherSteps.openMenu")}</li>
            <li>{t("pwa.addToHomeScreen.otherSteps.selectInstall")}</li>
            <li>{t("pwa.addToHomeScreen.otherSteps.confirm")}</li>
          </>
        )}
      </ol>
    </div>
  ) : (
    <p className="text-sm text-ink-600">
      {t("pwa.addToHomeScreen.followUp")}
    </p>
  );

  const notifDescription = t("pwa.notifications.description");
  const notifBody = (
    <p className="text-sm text-ink-600">
      {t("pwa.notifications.body")}
    </p>
  );

  if (isNativeWrapper) {
    return null;
  }

  return (
    <>
      <EngagementModal
        open={a2hsOpen}
        variant="a2hs"
        title={t("pwa.addToHomeScreen.title")}
        description={a2hsDescription}
        body={a2hsBody}
        primaryLabel={a2hsPrimaryLabel}
        secondaryLabel={t("pwa.notNow")}
        onPrimary={handleA2hsPrimary}
        onSecondary={closeA2hs}
        onClose={closeA2hs}
      />
      <EngagementModal
        open={notifOpen}
        variant="notifications"
        title={t("pwa.notifications.title")}
        description={notifDescription}
        body={notifBody}
        primaryLabel={notifBusy ? t("pwa.notifications.enabling") : t("pwa.notifications.enable")}
        secondaryLabel={t("pwa.notNow")}
        tertiaryLabel={t("pwa.notifications.neverAsk")}
        onPrimary={handleNotificationsPrimary}
        onSecondary={handleNotificationsSecondary}
        onTertiary={handleNotificationsNeverAsk}
        onClose={handleNotificationsSecondary}
      />
    </>
  );
}
