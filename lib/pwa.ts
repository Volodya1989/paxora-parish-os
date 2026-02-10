export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" } | undefined>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;

export function setDeferredPrompt(event: BeforeInstallPromptEvent | null) {
  deferredPrompt = event;
}

export function canShowInstallCTA(): boolean {
  return deferredPrompt !== null;
}

export async function triggerInstallPrompt(): Promise<boolean> {
  if (!deferredPrompt) {
    return false;
  }

  const promptEvent = deferredPrompt;
  deferredPrompt = null;

  await promptEvent.prompt();
  const choice = await promptEvent.userChoice;
  return choice?.outcome === "accepted";
}

export function isRunningStandalone(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator &&
      (window.navigator as unknown as { standalone?: boolean }).standalone === true)
  );
}

export function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return Promise.resolve("denied");
  }

  return Notification.requestPermission();
}

export function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
    return true;
  }

  // iPadOS 13+ reports as Macintosh; detect via touch + Mac combo
  return (
    navigator.userAgent.includes("Macintosh") &&
    typeof navigator.maxTouchPoints === "number" &&
    navigator.maxTouchPoints > 1
  );
}
