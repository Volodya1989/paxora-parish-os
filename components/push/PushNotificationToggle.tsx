"use client";

import { useCallback, useEffect, useState } from "react";
import { getClientShellContext } from "@/lib/monitoring/sentry-shell-context";
import {
  isPushSupported,
  isInstalledPWA,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  hasActivePushSubscription
} from "@/lib/push/client/register";

type PushState =
  | "loading"
  | "unsupported"
  | "denied"
  | "enabled"
  | "disabled"
  | "wrapper_unsupported";

/**
 * Push notification toggle for the profile/settings page.
 * Handles permission flow, subscription, and displays platform-specific guidance.
 */
export default function PushNotificationToggle() {
  const [state, setState] = useState<PushState>("loading");
  const [busy, setBusy] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isNativeWrapper, setIsNativeWrapper] = useState(false);

  useEffect(() => {
    async function check() {
      const shellContext = getClientShellContext();
      const nativeWrapper = shellContext.shell === "native_wrapper";

      setIsNativeWrapper(nativeWrapper);
      setIsStandalone(isInstalledPWA());

      if (nativeWrapper) {
        setState("wrapper_unsupported");
        return;
      }

      if (!isPushSupported()) {
        setState("unsupported");
        return;
      }

      const permission = getNotificationPermission();
      if (permission === "denied") {
        setState("denied");
        return;
      }

      const active = await hasActivePushSubscription();
      setState(active ? "enabled" : "disabled");
    }

    check();
  }, []);

  const handleToggle = useCallback(async () => {
    setBusy(true);
    try {
      if (state === "enabled") {
        const success = await unsubscribeFromPush();
        if (success) setState("disabled");
      } else {
        const permission = await requestNotificationPermission();
        if (permission === "denied") {
          setState("denied");
          return;
        }
        const success = await subscribeToPush();
        setState(success ? "enabled" : "disabled");
      }
    } finally {
      setBusy(false);
    }
  }, [state]);

  if (state === "loading") {
    return (
      <div className="flex items-center justify-between py-3">
        <div>
          <p className="text-sm font-medium text-gray-900">Push notifications</p>
          <p className="text-xs text-gray-500">Checking...</p>
        </div>
        <div className="h-6 w-11 rounded-full bg-gray-200 animate-pulse" />
      </div>
    );
  }


  if (state === "wrapper_unsupported") {
    return (
      <div className="flex items-center justify-between py-3">
        <div>
          <p className="text-sm font-medium text-gray-900">Push notifications</p>
          <p className="text-xs text-gray-500">
            Not available in this iOS wrapper mode. Use the installed home-screen app to test push notifications.
          </p>
        </div>
        <div className="h-6 w-11 rounded-full bg-gray-100" />
      </div>
    );
  }

  if (state === "unsupported") {
    return (
      <div className="flex items-center justify-between py-3">
        <div>
          <p className="text-sm font-medium text-gray-900">Push notifications</p>
          <p className="text-xs text-gray-500">
            Not supported in this browser.
            {!isStandalone && !isNativeWrapper && " Try installing the app to your home screen."}
          </p>
        </div>
        <div className="h-6 w-11 rounded-full bg-gray-100" />
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="flex items-center justify-between py-3">
        <div>
          <p className="text-sm font-medium text-gray-900">Push notifications</p>
          <p className="text-xs text-gray-500">
            Blocked by your browser. To enable, update notification permissions in your browser or device settings.
          </p>
        </div>
        <div className="h-6 w-11 rounded-full bg-gray-100" />
      </div>
    );
  }

  const enabled = state === "enabled";

  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-gray-900">Push notifications</p>
        <p className="text-xs text-gray-500">
          {enabled
            ? "Receive alerts for new messages, tasks, and announcements"
            : "Get notified about new messages, tasks, and announcements"}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={busy}
        onClick={handleToggle}
        className={`
          relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent
          transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${enabled ? "bg-blue-600" : "bg-gray-200"}
          ${busy ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <span
          className={`
            pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0
            transition duration-200 ease-in-out
            ${enabled ? "translate-x-5" : "translate-x-0"}
          `}
        />
      </button>
    </div>
  );
}
