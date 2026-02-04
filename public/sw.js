/// <reference lib="webworker" />

/**
 * Paxora Parish OS — Service Worker
 *
 * Handles:
 * - Push notification display
 * - Notification click → deep link
 * - Badge API management
 *
 * Platform notes:
 * - iOS Safari PWA: push supported since iOS 16.4 (installed PWAs only)
 * - Badge API: supported on Android Chrome, limited iOS support
 */

// eslint-disable-next-line no-restricted-globals
const sw = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self));

sw.addEventListener("install", () => {
  sw.skipWaiting();
});

sw.addEventListener("activate", (event) => {
  event.waitUntil(sw.clients.claim());
});

/**
 * Push event handler — display notification from server payload.
 */
sw.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = {
      title: "Paxora Parish OS",
      body: event.data.text() || "You have a new notification"
    };
  }

  const title = payload.title || "Paxora Parish OS";
  const options = {
    body: payload.body || "",
    icon: "/apple-icon.png",
    badge: "/icon-light-32x32.png",
    tag: payload.tag || "default",
    renotify: true,
    data: {
      url: payload.url || "/this-week"
    }
  };

  // Update badge count if provided
  if (payload.badge !== undefined && typeof navigator.setAppBadge === "function") {
    navigator.setAppBadge(payload.badge).catch(() => {});
  }

  event.waitUntil(sw.registration.showNotification(title, options));
});

/**
 * Notification click handler — open or focus the correct page.
 */
sw.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/this-week";

  event.waitUntil(
    sw.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Try to find an existing window and navigate it
      for (const client of clientList) {
        if ("focus" in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }

      // Open a new window if none found
      if (sw.clients.openWindow) {
        return sw.clients.openWindow(targetUrl);
      }
    })
  );
});

/**
 * Push subscription change handler — re-subscribe if subscription is lost.
 */
sw.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    sw.registration.pushManager
      .subscribe(event.oldSubscription?.options ?? { userVisibleOnly: true })
      .then((newSubscription) => {
        return fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newSubscription.toJSON())
        });
      })
      .catch((err) => {
        console.error("[sw] Failed to re-subscribe:", err);
      })
  );
});
