
import { isRunningStandalone, requestNotificationPermission } from "@/lib/pwa";
import { updateAppBadge } from "@/lib/push/client/badge";

/**
 * Service worker registration + push subscription management (client-side).
 *
 * Platform notes:
 * - iOS Safari: push works ONLY for installed PWAs (Add to Home Screen), iOS 16.4+
 * - Android Chrome: push works in browser and installed PWAs
 * - Desktop: push works in all major browsers
 * - Badge API: Chrome/Edge only, feature-detected at runtime
 */

/**
 * Register the service worker. Must be called from a client component.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    return registration;
  } catch (error) {
    console.error("[push] Service worker registration failed:", error);
    return null;
  }
}

/**
 * Check if push notifications are supported in this browser/context.
 */
export function isPushSupported(): boolean {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Check if the app is running as an installed PWA (standalone mode).
 */
export function isInstalledPWA(): boolean {
  return isRunningStandalone();
}

/**
 * Get current notification permission state.
 */
export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

/**
 * Request notification permission from the user.
 * Must be called from a user gesture (click/tap handler).
 */
export { requestNotificationPermission };

/**
 * Subscribe the user to push notifications and register with the server.
 */
export async function subscribeToPush(): Promise<boolean> {
  try {
    const registration = await registerServiceWorker();
    if (!registration) return false;

    // Get VAPID public key from server
    const keyResponse = await fetch("/api/push/vapid-key");
    if (!keyResponse.ok) return false;

    const { publicKey } = await keyResponse.json();
    if (!publicKey) return false;

    // Convert VAPID key to ArrayBuffer for PushManager.subscribe
    const applicationServerKey = urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer;

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    });

    // Send subscription to server
    const subJson = subscription.toJSON();
    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: subJson.endpoint,
        keys: subJson.keys
      })
    });

    return response.ok;
  } catch (error) {
    console.error("[push] Subscribe failed:", error);
    return false;
  }
}

/**
 * Unsubscribe from push notifications.
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker?.ready;
    if (!registration) return false;

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return true; // Already unsubscribed

    // Unsubscribe locally
    await subscription.unsubscribe();

    // Remove from server
    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: subscription.endpoint })
    });

    return true;
  } catch (error) {
    console.error("[push] Unsubscribe failed:", error);
    return false;
  }
}

/**
 * Check if the user currently has an active push subscription.
 */
export async function hasActivePushSubscription(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker?.ready;
    if (!registration) return false;

    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch {
    return false;
  }
}

/**
 * Set the home screen badge count. Feature-detected, no-op on unsupported platforms.
 */
export async function setAppBadge(count: number): Promise<void> {
  await updateAppBadge(count, "setAppBadge");
}

/**
 * Clear the home screen badge. Feature-detected, no-op on unsupported platforms.
 */
export async function clearAppBadge(): Promise<void> {
  await updateAppBadge(0, "clearAppBadge");
}

/**
 * Fetch badge count from server and update the home screen badge.
 */
export async function refreshBadge(): Promise<number> {
  try {
    const response = await fetch("/api/push/badge");
    if (!response.ok) return 0;

    const { count } = await response.json();
    await updateAppBadge(count ?? 0, "refreshBadge");
    if (process.env.NODE_ENV !== "production") {
      console.debug("[badge] refreshBadge unreadCount", count ?? 0);
    }
    return count ?? 0;
  } catch {
    return 0;
  }
}

// Utility: convert base64 VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
