# Code Review: Persistent In-App Notifications + PWA Engagement Flow

## Part 1 — Persistent In-App Notifications

### P0 — Critical

#### 1. Fallback logic creates a "lost notifications" gap

**File:** `lib/queries/notifications.ts:80-84`

```ts
const stored = await getStoredNotificationItems(userId, parishId);
if (stored.items.length > 0) {
  return stored;
}
// ...falls back to legacy
```

**Problem:** If a user has even 1 stored notification, the entire legacy path is skipped. But the user might have unread chat messages (tracked via `ChatRoomReadState`), unread tasks (tracked via `lastSeenTasksAt`), and unread announcements — none of which appear in stored notifications yet because they were created before the migration.

During the transition period a user who receives one task notification (stored) will lose visibility of all their legacy unread items.

**Fix — time-bounded fallback:**

```ts
async function getStoredNotificationItems(
  userId: string,
  parishId: string
): Promise<NotificationsResult & { hasAny: boolean }> {
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId, parishId },
      orderBy: { createdAt: "desc" },
      take: 50
    }),
    prisma.notification.count({
      where: { userId, parishId, readAt: null }
    })
  ]);

  return {
    hasAny: notifications.length > 0,
    items: notifications.map((notification) => ({
      id: notification.id,
      type: toNotificationCategory(notification.type),
      title: notification.title,
      description: notification.description ?? "",
      href: notification.href,
      timestamp: notification.createdAt.toISOString(),
      readAt: notification.readAt?.toISOString() ?? null
    })),
    count: unreadCount
  };
}

export async function getNotificationItems(
  userId: string,
  parishId: string
): Promise<NotificationsResult> {
  const stored = await getStoredNotificationItems(userId, parishId);

  // Once stored notifications are the sole source, skip legacy
  if (stored.hasAny) {
    return stored;
  }

  // Legacy fallback for pre-migration data
  // TODO: Remove this fallback after a migration backfill or a sufficient
  //       transition period (e.g., 30 days after deployment).
  const [messages, tasks, announcements, events, pendingRequests, requestUpdates] = ...
```

Alternatively, add a backfill step in the migration that inserts stored notifications from existing unread state, then remove the legacy path entirely.

---

#### 2. Single-notification mark-read bumps category-wide `lastSeen` timestamp

**File:** `app/api/notifications/mark-read/route.ts:57-77`

```ts
if (notification) {
  await prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: now }
  });
  // ...
  if (mappedCategory === "task") updateData.lastSeenTasksAt = now;
  // ...
}
```

**Problem:** Clicking a single task notification updates `lastSeenTasksAt = now`, which the legacy fallback uses to determine "new" tasks. This means all legacy task items older than `now` are marked as seen, even though the user only read one notification.

**Fix:** Do not update `lastSeen*` timestamps when marking a single notification by ID. The stored notification system tracks per-item `readAt`; the `lastSeen` timestamps are legacy concerns that should only be updated during category-level or mark-all operations.

```ts
if (notificationId) {
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId,
      parishId: session.user.activeParishId
    }
  });

  if (notification) {
    await prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: now }
    });
  }
  // Do NOT update lastSeen* timestamps here.
  // Category-level and mark-all paths handle that.
}
```

---

#### 3. Chat in-app notifications silently swallowed

**File:** `server/actions/chat.ts:424-431`

```ts
notifyChatMessageInApp({ ... }).catch(() => {});
```

**Problem:** The persistent in-app notification is now the primary notification system. Silently swallowing errors means if the DB write fails (e.g., connection pool exhausted, unique constraint), the user gets no notification and no one knows. This is inconsistent with the task flow (which uses `try/catch` with `console.error`).

**Fix:** Log the error consistently across all writers:

```ts
notifyChatMessageInApp({ ... }).catch((error) => {
  console.error("[chat] Failed to create in-app notification:", error);
});
```

Apply the same fix to:
- `server/actions/announcements.ts:154-159` and `282-287`
- `server/actions/events.ts:272-279`
- `server/actions/requests.ts:194-200`, `436-441`, `1077-1082`

---

### P1 — High

#### 4. Missing write point: `updateTask` reassignment

**File:** `domain/tasks/index.ts:754-776`

When `updateTask` changes `ownerId`, it creates a task activity and fires push notification via `notifyTaskAssigned`, but does NOT create an in-app notification via `notifyTaskAssignedInApp`.

**Fix:** Add in-app notification after the push notification:

```ts
if (ownerId !== undefined && ownerId !== previousOwnerId) {
  // ... existing activity log ...

  // Fire push + in-app notifications for reassignment
  if (ownerId && ownerId !== actorUserId) {
    const actor = await prisma.user.findUnique({
      where: { id: actorUserId },
      select: { name: true, email: true }
    });
    notifyTaskAssigned({ ... }).catch(() => {});
    notifyTaskAssignedInApp({
      taskId,
      taskTitle: title,
      parishId,
      actorId: actorUserId,
      actorName: actor?.name ?? actor?.email ?? "Someone",
      ownerId
    }).catch((error) => {
      console.error("[tasks] Failed to create in-app reassignment notification:", error);
    });
  }
}
```

---

#### 5. Missing write point: `cancelRequest` doesn't notify requester in-app

**File:** `server/actions/requests.ts:790-928`

`cancelRequest` (admin canceling a request) sends a cancellation email but does not call `notifyRequestStatusUpdatedInApp`. The requester has no in-app notification that their request was canceled.

**Fix:** Add after the status update:

```ts
await prisma.request.update({
  where: { id: request.id },
  data: { status: "CANCELED", ... }
});

if (request.createdByUserId && request.createdByUserId !== session.user.id) {
  notifyRequestStatusUpdatedInApp({
    requestId: request.id,
    requestTitle: request.title,
    parishId,
    requesterId: request.createdByUserId,
    status: "CANCELED"
  }).catch((error) => {
    console.error("[requests] Failed to create in-app cancellation notification:", error);
  });
}
```

---

#### 6. Missing write point: task completion notification

**File:** `domain/tasks/index.ts:354-535` (`markTaskDone`)

When a task is completed, the creator and assignee receive emails but no in-app notification. Users who don't check email won't know their task was completed.

---

#### 7. Notification table unbounded growth

**File:** `lib/notifications/notify.ts:20-31`

`createNotificationsForUsers` inserts rows indefinitely. For chat messages in a 500-member parish channel, each message creates 499 rows. An active channel producing 100 messages/day creates ~50,000 rows/day.

**Mitigations (pick one or both):**
- Add a cron job to delete notifications older than 30 days
- Add a `NOT EXISTS` check or deduplication for chat notifications (e.g., only 1 notification per channel per user within a 5-minute window)

---

### P2 — Medium

#### 8. Panel auto-marks all read on close

**File:** `components/notifications/NotificationProvider.tsx:49-56`

```ts
const handleClose = useCallback(() => {
  if (hadItemsRef.current) {
    markAllRead();
    hadItemsRef.current = false;
  }
  setPanelOpen(false);
}, [markAllRead]);
```

Opening the panel and immediately closing it marks everything read. Now that per-item read state exists, consider removing this auto-clear behavior so users can explicitly mark items as read by clicking them.

---

#### 9. Unused `eventId` in `notifyEventCreatedInApp`

**File:** `lib/notifications/notify.ts:172`

```ts
const { eventId: _eventId, eventTitle, ... } = opts;
```

`eventId` is destructured but unused. The `href` is hardcoded to `/calendar` instead of linking to the specific event. Consider using `/calendar?eventId=${eventId}` if the calendar supports deep-linking.

---

#### 10. Double `fetchNotifications` after mark-read

**File:** `components/notifications/useNotifications.ts:67-90`

`markNotificationRead` does optimistic UI update, then calls the API, then calls `fetchNotifications()`. This is a double fetch (the optimistic update already shows the correct state). The refetch is a safety net but adds latency and server load.

Consider removing the refetch after optimistic update, or debouncing it.

---

### P3 — Low

#### 11. Test coverage gaps

**File:** `tests/notifications.test.ts`

The single test covers task assignment only. Missing tests:
- Chat message notifications (most complex recipient logic — GROUP, ANNOUNCEMENT, parish-open channels)
- Mark-read endpoint behavior (individual, category, all)
- Announcement notifications
- Event reminder deduplication
- Request assignment and status update notifications

#### 12. Missing backfill strategy

There is no backfill migration that creates stored notifications from existing `lastSeen`-based unread items. Existing users will remain on the legacy path until a new notification is created for them.

---

## Part 2 — PWA Engagement Flow

### Gaps / Risks

#### 1. A2HS prompt shows on very first visit

**File:** `lib/pwa/engagement.ts:153-164`

```ts
export function shouldShowA2HS(sessionCount: number, isStandalone: boolean): boolean {
  if (isStandalone) return false;
  const state = readState(A2HS_PROMPT_KEY);
  if (!state.lastShownAt) return true; // <-- first visit
  return hasCooldownElapsed(state, sessionCount);
}
```

The prompt fires immediately on the user's first session. This is aggressive — the user hasn't even explored the app yet. Consider requiring `sessionCount >= 2` before showing the A2HS prompt.

**Fix:**

```ts
export function shouldShowA2HS(sessionCount: number, isStandalone: boolean): boolean {
  if (isStandalone) return false;
  if (sessionCount < 2) return false; // Wait for second visit
  const state = readState(A2HS_PROMPT_KEY);
  if (!state.lastShownAt) return true;
  return hasCooldownElapsed(state, sessionCount);
}
```

---

#### 2. `appinstalled` sets `isStandalone(true)` prematurely

**File:** `components/pwa/EngagementPrompts.tsx:68-72`

```ts
const handleAppInstalled = () => {
  markInstalledAt();
  setIsStandalone(true); // User hasn't launched standalone yet
  setA2hsOpen(false);
};
```

After the user installs but before launching the standalone version, `isStandalone` is true. This can prematurely trigger the notification permission prompt (which should only show in standalone). The user is still in the browser tab.

**Fix:** Don't set `isStandalone(true)` on `appinstalled`. Let `isRunningStandalone()` determine this on the next launch:

```ts
const handleAppInstalled = () => {
  markInstalledAt();
  setA2hsOpen(false);
  // isStandalone will be true on next launch via isRunningStandalone()
};
```

---

#### 3. Double rendering in EngagementModal

**File:** `components/pwa/EngagementModal.tsx:58-106`

Both the mobile bottom sheet (lines 60-97) and the desktop `<Modal>` (line 98) render simultaneously when `open` is true. They are toggled via CSS (`md:hidden` / `hidden md:block`), but:

- Both dialog elements exist in the DOM, meaning screen readers see two dialogs
- The `<Modal>` component likely manages focus trapping, which could interfere with the mobile sheet
- Tab navigation might cycle through invisible elements

**Fix:** Use a single responsive container, or conditionally render based on viewport width using a media query hook, or ensure `<Modal>` wraps only the desktop path:

```tsx
return (
  <>
    {/* Mobile: bottom sheet */}
    <div className="fixed inset-0 z-50 flex items-end md:hidden">
      {/* ... mobile content ... */}
    </div>
    {/* Desktop: modal - only render at md+ */}
    <div className="hidden md:block">
      <Modal open={open} onClose={onClose} title={title} footer={footer}>
        <div className="space-y-3">
          <p>{description}</p>
          {body}
        </div>
      </Modal>
    </div>
  </>
);
```

---

#### 4. iOS detection misses iPadOS 13+

**File:** `lib/pwa.ts:49-55`

```ts
export function isIOSDevice(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}
```

iPads running iPadOS 13+ report as `Macintosh` in the user agent string. This means iPad users see Android/desktop instructions instead of iOS instructions.

**Fix:**

```ts
export function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return true;
  // iPadOS 13+ reports as Macintosh; detect via touch + Mac combo
  return (
    navigator.userAgent.includes("Macintosh") &&
    typeof navigator.maxTouchPoints === "number" &&
    navigator.maxTouchPoints > 1
  );
}
```

---

#### 5. Session count inflation

**File:** `lib/pwa/engagement.ts:47-57`

`incrementSessionCount()` is called every time `EngagementPrompts` mounts. In a Next.js SPA with client-side routing, the component may remount on navigation. If `AppShell` is a layout that persists across routes this won't be an issue, but if it re-renders (e.g., due to `searchParams` changes), the count inflates.

Current implementation appears safe because `AppShell` is a layout component, but this assumption should be documented or guarded with `sessionStorage`:

```ts
export function incrementSessionCount(): number {
  if (typeof window === "undefined") return 0;
  // Only increment once per browser session
  if (window.sessionStorage.getItem("paxora.sessionCounted")) {
    return getSessionCount();
  }
  window.sessionStorage.setItem("paxora.sessionCounted", "1");
  // ... existing increment logic ...
}
```

---

#### 6. No "Don't ask again" for A2HS

**File:** `lib/pwa/engagement.ts:89-95`

`markPromptNeverAskAgain()` only applies to notifications. The A2HS prompt will keep reappearing after cooldowns expire. Users who have explicitly chosen not to install have no way to permanently dismiss it.

**Fix:** Add `neverAskAgain` support for A2HS in `shouldShowA2HS`:

```ts
export function shouldShowA2HS(sessionCount: number, isStandalone: boolean): boolean {
  if (isStandalone) return false;
  const state = readState(A2HS_PROMPT_KEY);
  if (state.neverAskAgain) return false;
  if (!state.lastShownAt) return true;
  return hasCooldownElapsed(state, sessionCount);
}
```

And add a "Don't ask again" option to the A2HS modal (currently only "Not now").

---

#### 7. Race condition between A2HS and notification prompts

**File:** `components/pwa/EngagementPrompts.tsx:99-126`

Two independent `useEffect` hooks evaluate whether to show A2HS or notifications. Both check `!a2hsOpen && !notifOpen`. On the first render after `sessionCount` is set, React 18's batching should prevent both from firing, but the guard is fragile.

**Improvement:** Use a single effect to decide which prompt to show:

```ts
useEffect(() => {
  if (!sessionCount || a2hsOpen || notifOpen) return;

  if (shouldShowA2HS(sessionCount, isStandalone)) {
    setA2hsOpen(true);
    markPromptShown("a2hs", sessionCount);
    return; // Only show one at a time
  }

  if (shouldShowNotifications({ sessionCount, isStandalone, permission: notificationPermission, highIntent })) {
    setNotifOpen(true);
    markPromptShown("notifications", sessionCount);
  }
}, [a2hsOpen, highIntent, isStandalone, notifOpen, notificationPermission, sessionCount]);
```

---

#### 8. `markPromptShown` called before modal displays

**File:** `components/pwa/EngagementPrompts.tsx:106, 124`

`markPromptShown` is called in the same effect that opens the modal. If the component unmounts before the modal renders (e.g., route change), a cooldown window is wasted. Consider calling `markPromptShown` inside the modal's `onOpen` or after confirming it rendered.

---

### Push Flow Compatibility

- `subscribeToPush()` in `EngagementPrompts` calls the same function used by `PushNotificationToggle`. No conflict observed — both register the same service worker and push subscription.
- `requestNotificationPermission` is correctly re-exported from `lib/pwa.ts` and reused in `lib/push/client/register.ts`.
- The engagement flow correctly only prompts for notifications when `isStandalone` is true and permission is `"default"`.

---

### Task Notification Fix Assessment

**File:** `domain/tasks/index.ts:116-127`

The fix wraps `notifyTaskCreatedInApp` in `try/catch` with `await`:

```ts
try {
  await notifyTaskCreatedInApp({ ... });
} catch (error) {
  console.error("[tasks] Failed to create in-app task notification:", error);
}
```

This is correct. The previous fire-and-forget pattern (`notifyTaskCreatedInApp(...).catch(() => {})`) could cause the test assertion to run before the DB write completed. Using `await` ensures the notification row exists before the function returns.

The same pattern is applied to `assignTaskToUser` (line 1054-1065). Both are correct.

**Inconsistency:** The push notification (`notifyTaskCreated`) is still fire-and-forget (line 108-115), which is appropriate for push (external service, best-effort). The in-app notification is `await`ed, which is appropriate for DB writes needed by tests and correctness.

---

## Summary of Recommended Changes (Priority Order)

| # | Priority | File | Issue |
|---|----------|------|-------|
| 1 | P0 | `lib/queries/notifications.ts` | Fallback logic loses legacy items when any stored item exists |
| 2 | P0 | `api/notifications/mark-read/route.ts` | Single-notification mark-read incorrectly bumps category lastSeen |
| 3 | P0 | `server/actions/chat.ts` | Silent error swallowing on in-app notification writes |
| 4 | P1 | `domain/tasks/index.ts` | Missing in-app notification for `updateTask` reassignment |
| 5 | P1 | `server/actions/requests.ts` | Missing in-app notification for `cancelRequest` |
| 6 | P1 | `domain/tasks/index.ts` | Missing in-app notification for task completion |
| 7 | P1 | `lib/notifications/notify.ts` | Notification table unbounded growth (chat volume) |
| 8 | P2 | `NotificationProvider.tsx` | Auto-mark-all-read on panel close |
| 9 | P2 | `lib/pwa/engagement.ts` | A2HS prompt on first visit |
| 10 | P2 | `EngagementPrompts.tsx` | `appinstalled` prematurely sets standalone |
| 11 | P2 | `EngagementModal.tsx` | Double DOM rendering (mobile + desktop) |
| 12 | P2 | `lib/pwa.ts` | iPadOS 13+ detection failure |
| 13 | P2 | `lib/pwa/engagement.ts` | No "Don't ask again" for A2HS |
| 14 | P2 | `EngagementPrompts.tsx` | Race condition between A2HS and notification prompts |
| 15 | P3 | `tests/notifications.test.ts` | Insufficient test coverage |
| 16 | P3 | Migration | No backfill strategy for existing unread items |
