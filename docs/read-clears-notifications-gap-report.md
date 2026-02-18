# Read Clears Notifications – Gap Report

## Investigated paths

- **Chat read-state update path**
  - `server/actions/chat.ts` (`markRoomRead` upserts `ChatRoomReadState` on chat open/poll).
  - `components/chat/ChatView.tsx` (calls `markRoomRead(channel.id)` on channel mount and when polling receives new messages).
- **Bell badge count computation**
  - `lib/queries/notifications.ts` (`getNotificationUnreadCount` and `getNotificationItems`).
  - `components/notifications/useNotifications.ts` (client polling `/api/notifications` and rendering count in bell).
  - `app/api/notifications/route.ts` (bell data source endpoint).
- **Chat list unread badge computation**
  - `lib/queries/chat.ts` (`listUnreadCountsForRooms` compares `ChatMessage.createdAt` vs `ChatRoomReadState.lastReadAt`).
  - `lib/queries/groups.ts` (maps room unread counts to group list `unreadCount`).
  - `components/groups/GroupCard.tsx` / `components/groups/GroupChatListCard.tsx` (renders unread badges).

## Root cause

The app currently has **two unread systems for chat**: room-derived unread (`ChatRoomReadState`) and stored in-app notifications (`Notification` rows of type `MESSAGE`/`MENTION`). Opening a chat calls `markRoomRead`, which updates only `ChatRoomReadState`, but it does **not** mark related `Notification` rows as read. Since bell count prefers stored notifications when any exist (`getNotificationUnreadCount`), chat can be read while bell/inbox still show unread chat notifications. Also, chat-open actions do not explicitly refresh notification client state, so UI can stay stale until periodic polling.

## Minimal fix plan

- Extend the chat read write path (`markRoomRead`) to also mark matching unread chat notifications (`MESSAGE`/`MENTION`) as `readAt` for that user/parish/channel.
- Keep existing membership/parish enforcement by reusing `requireChannelAccess` in `markRoomRead` before the write.
- Trigger an immediate notification refresh in the client after room-read succeeds (custom event consumed by notifications hook), so bell/inbox clear without waiting for poll.
- Keep existing query architecture intact (no migration, no schema changes, no expensive per-message loops).

## Risks and mitigations

- **Double counting / split source of truth risk:** If stored notifications and derived unread diverge, badge inconsistencies occur.
  - **Mitigation:** Mirror chat read operation to both sources at read time.
- **Over-clearing message notifications risk:** Could accidentally clear unrelated chats.
  - **Mitigation:** Scope notification update by `userId + parishId + type in [MESSAGE, MENTION] + href contains channelId + readAt null`.
- **Stale UI/cache risk:** Bell can remain outdated until poll cycle.
  - **Mitigation:** trigger immediate notifications refetch after `markRoomRead`; keep existing periodic polling for multi-device eventual consistency.
