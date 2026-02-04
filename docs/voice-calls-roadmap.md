# Voice Calls Roadmap — Approach B (Third-Party SDK)

**Date:** 2026-02-04
**Prerequisite:** [Voice Calls Investigation](./voice-calls-investigation.md)

---

## Provider Recommendation: LiveKit

After evaluating the options, **LiveKit** is the recommended provider for Paxora because:

1. **Open-source core** — Can self-host later to reduce costs, or use LiveKit Cloud to start fast
2. **First-class React SDK** (`@livekit/components-react`) — Matches your React 19 stack
3. **Server SDK for Node.js** (`livekit-server-sdk`) — Token generation from Next.js API routes
4. **Built-in TURN/STUN** — No separate infrastructure needed
5. **Group calls included** — SFU handles any participant count
6. **Audio-only rooms** — Can create voice-only rooms (no video bandwidth)
7. **Free tier** — 50 GB bandwidth/month on LiveKit Cloud, sufficient for a parish

**Alternative:** Daily.co if you want the absolute simplest integration (prebuilt `<DailyIframe>` component), at the cost of less customization.

---

## Phase 0 — Prerequisites & Provider Setup (Week 1)

> Goal: Account setup, dependencies installed, environment configured.

### 0.1 Create LiveKit Cloud Account
- Sign up at livekit.io
- Create a project
- Note the **API Key**, **API Secret**, and **WebSocket URL**

### 0.2 Add Environment Variables
**File:** `.env` (update `.env.example` too)
```env
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
LIVEKIT_URL=wss://your-project.livekit.cloud
```

### 0.3 Install Dependencies
```bash
npm install livekit-server-sdk @livekit/components-react livekit-client
```

| Package | Purpose |
|---------|---------|
| `livekit-server-sdk` | Server-side: generate access tokens, create rooms, manage participants |
| `livekit-client` | Client-side: connect to rooms, manage audio tracks |
| `@livekit/components-react` | React hooks + prebuilt components for call UI |

### 0.4 Add LiveKit Config Module
**New file:** `lib/voice/livekit.ts`
```typescript
import { AccessToken } from "livekit-server-sdk";

export function createCallToken(opts: {
  userId: string;
  userName: string;
  roomName: string;
}) {
  const token = new AccessToken(
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
    { identity: opts.userId, name: opts.userName }
  );
  token.addGrant({
    room: opts.roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  });
  return token.toJwt();
}
```

---

## Phase 1 — Database Schema & Server Actions (Week 1–2)

> Goal: Call records persisted, server actions for call lifecycle, API route for token generation.

### 1.1 Prisma Schema Migration
**File:** `prisma/schema.prisma`

Add to the bottom (after existing `ChatPollVote` model):

```prisma
enum VoiceCallStatus {
  RINGING
  ACTIVE
  ENDED
  MISSED
  DECLINED
}

enum CallParticipantStatus {
  INVITED
  RINGING
  CONNECTED
  DISCONNECTED
  DECLINED
}

model VoiceCall {
  id             String                @id @default(cuid())
  channelId      String
  channel        ChatChannel           @relation(fields: [channelId], references: [id], onDelete: Cascade)
  initiatorId    String
  initiator      User                  @relation("CallInitiator", fields: [initiatorId], references: [id])
  roomName       String                @unique
  status         VoiceCallStatus       @default(RINGING)
  startedAt      DateTime?
  endedAt        DateTime?
  duration       Int?
  createdAt      DateTime              @default(now())
  participants   VoiceCallParticipant[]

  @@index([channelId, createdAt])
  @@index([initiatorId])
  @@index([status])
}

model VoiceCallParticipant {
  id        String                @id @default(cuid())
  callId    String
  call      VoiceCall             @relation(fields: [callId], references: [id], onDelete: Cascade)
  userId    String
  user      User                  @relation("CallParticipant", fields: [userId], references: [id])
  joinedAt  DateTime?
  leftAt    DateTime?
  status    CallParticipantStatus @default(INVITED)
  createdAt DateTime              @default(now())

  @@unique([callId, userId])
  @@index([userId])
  @@index([callId, status])
}
```

Add relations to existing models:

**On `User` model** — add two new lines:
```prisma
  initiatedCalls        VoiceCall[]              @relation("CallInitiator")
  callParticipations    VoiceCallParticipant[]   @relation("CallParticipant")
```

**On `ChatChannel` model** — add:
```prisma
  voiceCalls    VoiceCall[]
```

Then run:
```bash
npx prisma migrate dev --name add-voice-calls
```

### 1.2 Server Actions for Call Lifecycle
**New file:** `server/actions/voice.ts`

Following the existing pattern in `server/actions/chat.ts` (uses `getServerSession`, `assertSession`, `requireChannelAccess`):

| Action | Description | Key Logic |
|--------|-------------|-----------|
| `initiateCall(channelId, targetUserIds?)` | Create `VoiceCall` row, create `VoiceCallParticipant` rows for all targets, send push notification to targets, return call ID + room name | Reuse `requireChannelAccess()` from chat.ts. Generate room name as `call-${callId}`. For 1-on-1: single target. For group: all channel members. |
| `answerCall(callId)` | Update participant status to CONNECTED, update call status to ACTIVE if first answer, set `startedAt` | Validate caller is a participant with status INVITED/RINGING |
| `declineCall(callId)` | Update participant status to DECLINED. If all participants declined, set call status to DECLINED | |
| `endCall(callId)` | Set call status to ENDED, set `endedAt`, calculate `duration`, update all connected participants to DISCONNECTED | |
| `getCallToken(callId)` | Generate LiveKit access token for the authenticated user to join the room | Uses `lib/voice/livekit.ts` |
| `getActiveCall(channelId)` | Return any RINGING/ACTIVE call for this channel | For checking if a call is in progress |
| `getCallHistory(channelId, limit?)` | Return recent ended calls for this channel | Paginated, most recent first |

### 1.3 API Route for LiveKit Token
**New file:** `app/api/voice/token/route.ts`

This is needed because LiveKit's client SDK needs a token via HTTP before connecting:
```
GET /api/voice/token?callId={callId}
→ { token: "eyJ...", url: "wss://..." }
```

Validates session, checks call participation, returns JWT + WebSocket URL.

### 1.4 API Route for Call Polling (Incoming Calls)
**New file:** `app/api/voice/active/route.ts`

Since there are no WebSockets, the client needs to poll for incoming calls:
```
GET /api/voice/active?parishId={parishId}
→ { call: { id, channelId, initiator, status, createdAt } | null }
```

This returns any RINGING call where the current user is a participant with status INVITED. Poll interval: 3 seconds (matching existing chat polling).

---

## Phase 2 — Call UI Components (Week 2–4)

> Goal: Call button in chat header, incoming call overlay, active call screen with controls.

### 2.1 Call Button in Chat Header
**File to modify:** `components/chat/ChatHeader.tsx`

Add a phone icon button next to the existing channel search and overflow menu buttons (line 134 area, inside the `shrink-0 items-center gap-1` div):

```tsx
{/* Voice call button */}
{canCall ? (
  <button
    type="button"
    className="flex h-8 w-8 items-center justify-center rounded-full text-white/80
               transition hover:bg-white/10 hover:text-white"
    aria-label="Start voice call"
    onClick={onStartCall}
  >
    <PhoneIcon className="h-5 w-5" />
  </button>
) : null}
```

Props to add to ChatHeader: `canCall: boolean`, `onStartCall: () => void`.

### 2.2 Incoming Call Overlay
**New file:** `components/voice/IncomingCallOverlay.tsx`

Full-screen overlay (similar to Telegram's incoming call screen):
- Caller name + avatar
- Channel name
- "Accept" button (green, animated pulse)
- "Decline" button (red)
- Auto-dismiss after 30 seconds → mark call as MISSED
- Plays browser notification sound via `new Audio("/sounds/ringtone.mp3")`

Mount this at the layout level (`app/[locale]/(app)/layout.tsx`) so it appears regardless of which page the user is on.

### 2.3 Active Call Screen
**New file:** `components/voice/ActiveCallScreen.tsx`

Uses LiveKit React components:
```tsx
import { LiveKitRoom, AudioTrack, useParticipants } from "@livekit/components-react";
```

UI elements:
- Call duration timer
- Participant list with speaking indicators (`useIsSpeaking()` hook)
- Mute/unmute toggle
- Speaker toggle (earpiece vs speaker — mobile only)
- End call button
- Connection quality indicator (`useConnectionQuality()`)

Display as:
- **Mobile:** Full-screen overlay (like existing chat section: `fixed inset-0 z-40`)
- **Desktop:** Floating panel in bottom-right corner (like Discord's voice panel)

### 2.4 Call State Context Provider
**New file:** `components/voice/VoiceCallProvider.tsx`

React context that wraps the app layout:

```tsx
type VoiceCallState = {
  activeCall: VoiceCall | null;
  incomingCall: VoiceCall | null;
  startCall: (channelId: string) => Promise<void>;
  answerCall: (callId: string) => Promise<void>;
  declineCall: (callId: string) => Promise<void>;
  endCall: () => Promise<void>;
  isMuted: boolean;
  toggleMute: () => void;
};
```

Responsibilities:
- Polls `/api/voice/active` every 3 seconds for incoming calls
- Manages LiveKit room connection lifecycle
- Provides call state to all child components
- Handles browser audio permissions prompt

### 2.5 Call History in Chat
**New file:** `components/voice/CallHistoryMessage.tsx`

When a call ends, insert a system message into the chat channel (similar to how Telegram shows "Voice call (2:34)"):
- Create a `ChatMessage` with a special body format: `📞 Voice call · 2m 34s`
- Or add a `callId` field to `ChatMessage` to link to a `VoiceCall` and render a custom card

### 2.6 Asset: Ringtone Sound
**New file:** `public/sounds/ringtone.mp3`

A short, pleasant ringtone loop. Use a royalty-free tone.

---

## Phase 3 — Push Notifications for Incoming Calls (Week 3–4)

> Goal: Notify users of incoming calls even when the app tab is not focused.

### 3.1 Add Call Notification to Push System
**File to modify:** `lib/push/notify.ts`

Add a new function following the existing `notifyChatMessage` pattern:

```typescript
export async function notifyIncomingCall(opts: {
  callId: string;
  channelId: string;
  callerName: string;
  channelName: string;
  parishId: string;
  targetUserIds: string[];
}) {
  const payload: PushPayload = {
    title: `Incoming call from ${opts.callerName}`,
    body: `Voice call in ${opts.channelName}`,
    url: `/community/chat?channel=${opts.channelId}&callId=${opts.callId}`,
    tag: `voice-call-${opts.callId}`,
  };

  await sendPushToUsers(opts.targetUserIds, opts.parishId, payload);
}
```

### 3.2 Update Service Worker for Call Notifications
**File to modify:** `public/sw.js`

Enhance the push handler to recognize call notifications and show them with higher urgency:

```javascript
// Inside the push event handler, before showNotification:
if (payload.tag && payload.tag.startsWith("voice-call-")) {
  options.requireInteraction = true;   // Keep notification visible until interacted
  options.vibrate = [200, 100, 200, 100, 200]; // Vibration pattern
  options.actions = [
    { action: "answer", title: "Answer" },
    { action: "decline", title: "Decline" }
  ];
}
```

Also add a `notificationclick` handler for the answer/decline actions.

### 3.3 PWA Limitations — Documented Workarounds

| Limitation | Workaround |
|-----------|------------|
| No ringtone on iOS push | Use `requireInteraction: true` + vibrate pattern. Recommend users install as PWA. |
| No full-screen incoming call UI from push | Deep link to app with `?callId=` param. `VoiceCallProvider` detects param on mount. |
| Browser tab must be open for audio | Show "Return to call" notification if user navigates away. Cannot solve for fully closed browser. |
| No CallKit on iOS | Not solvable in PWA. Native app wrapper (Capacitor) could add this later. |

---

## Phase 4 — Group Calls (Week 5–6)

> Goal: Support 3+ participant voice calls in group channels.

### 4.1 Group Call Initiation
Modify `initiateCall` server action:
- For GROUP channels: auto-invite all active group members
- For PARISH channels: caller selects participants (member picker UI)
- LiveKit handles SFU — no extra infrastructure needed

### 4.2 Participant Management During Call
**New file:** `components/voice/CallParticipantList.tsx`

- Show all participants with status (ringing, connected, left)
- Speaking indicator per participant (LiveKit `useIsSpeaking` hook)
- "Add participant" button → opens member picker
- Coordinator/Admin can mute others

### 4.3 Group Call UI Differences
- Show participant grid instead of single caller
- "X participants" subtitle
- Different ringtone/notification copy: "Group call in {channel name}"

---

## Phase 5 — Call History & Polish (Week 6–8)

> Goal: Call history, missed call badges, edge case handling.

### 5.1 Call History View
**New file:** `components/voice/CallHistory.tsx`

Add a "Calls" tab or section to the chat view:
- List of recent calls: caller name, duration, date, participants
- Missed calls highlighted
- Tap to call back

### 5.2 Missed Call Badge
**File to modify:** `lib/push/sendPush.ts`

Update the badge calculation query (`/api/push/badge`) to include missed calls:
```sql
-- Add to existing badge count query
+ (SELECT COUNT(*) FROM "VoiceCallParticipant"
   WHERE "userId" = $1 AND status = 'INVITED'
   AND "call"."status" = 'MISSED')
```

### 5.3 Call Timeout Logic
**File to modify:** `server/actions/voice.ts`

Add timeout handling:
- If a call stays in RINGING for >30 seconds, auto-transition to MISSED
- Can be checked client-side (in `VoiceCallProvider` poll) or via a cron job

**Option A (client-side):** When polling returns a RINGING call older than 30s, the initiator's client calls `endCall` with status MISSED.

**Option B (cron):** Add to existing cron infrastructure:
**New file:** `app/api/cron/expire-calls/route.ts`
```typescript
// Find RINGING calls older than 30 seconds, set to MISSED
```

### 5.4 Edge Cases

| Edge Case | Handling |
|-----------|----------|
| Network drop during call | LiveKit auto-reconnects for ~15s. If reconnect fails, update participant status to DISCONNECTED. Show "Reconnecting..." UI. |
| Simultaneous incoming calls | Queue them. Show most recent. Decline others automatically or show a list. |
| Call while in another call | Show "busy" status. Decline incoming automatically or show swap option. |
| Browser tab closed during call | Audio continues (tab is not closed, just unfocused). If truly closed, participant disconnects — LiveKit notifies other participants. |
| Caller cancels before answer | Initiator calls `endCall` → push notification dismissed → overlay removed on next poll. |

### 5.5 Accessibility
- Keyboard navigation for all call controls
- Screen reader announcements for call state changes
- Reduced motion: disable pulse animation on answer button
- Sufficient color contrast on call overlay (dark background)

---

## File Change Summary

### New Files (14)

| File | Purpose |
|------|---------|
| `lib/voice/livekit.ts` | LiveKit token generation |
| `server/actions/voice.ts` | Call lifecycle server actions |
| `app/api/voice/token/route.ts` | Token API endpoint |
| `app/api/voice/active/route.ts` | Incoming call polling endpoint |
| `app/api/cron/expire-calls/route.ts` | Timeout stale RINGING calls |
| `components/voice/VoiceCallProvider.tsx` | React context for call state |
| `components/voice/IncomingCallOverlay.tsx` | Incoming call UI |
| `components/voice/ActiveCallScreen.tsx` | Active call UI with LiveKit |
| `components/voice/CallParticipantList.tsx` | Group call participant grid |
| `components/voice/CallHistory.tsx` | Call history list |
| `components/voice/CallHistoryMessage.tsx` | System message for ended calls |
| `components/voice/types.ts` | TypeScript types for voice calls |
| `lib/queries/voice.ts` | Database queries for calls |
| `public/sounds/ringtone.mp3` | Ringtone audio file |

### Modified Files (8)

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add VoiceCall, VoiceCallParticipant models + enums + relations on User and ChatChannel |
| `components/chat/ChatHeader.tsx` | Add call button (phone icon) |
| `components/chat/ChatView.tsx` | Wire up call button to VoiceCallProvider |
| `app/[locale]/(app)/layout.tsx` | Wrap with VoiceCallProvider, mount IncomingCallOverlay |
| `lib/push/notify.ts` | Add `notifyIncomingCall()` function |
| `public/sw.js` | Handle call notification actions (answer/decline) |
| `.env.example` | Add LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL |
| `package.json` | Add livekit-server-sdk, livekit-client, @livekit/components-react |

---

## Dependencies to Install

```bash
npm install livekit-server-sdk livekit-client @livekit/components-react
```

| Package | Version | Size | Purpose |
|---------|---------|------|---------|
| `livekit-server-sdk` | ^2.x | ~50KB | Server: token generation, room management |
| `livekit-client` | ^2.x | ~300KB | Client: WebRTC connection, track management |
| `@livekit/components-react` | ^2.x | ~100KB | React hooks: useParticipants, useIsSpeaking, AudioTrack |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `LIVEKIT_API_KEY` | Yes | From LiveKit Cloud dashboard |
| `LIVEKIT_API_SECRET` | Yes | From LiveKit Cloud dashboard |
| `LIVEKIT_URL` | Yes | WebSocket URL: `wss://your-project.livekit.cloud` |

---

## Cost Estimate (LiveKit Cloud)

| Usage Tier | Monthly Cost | Capacity |
|------------|-------------|----------|
| Free tier | $0 | 50 GB bandwidth (~8,300 hours of audio) |
| Starter | ~$50 | 200 GB bandwidth |
| Growth | ~$150 | 1 TB bandwidth |

For a parish of ~100–500 members with moderate call usage (a few calls per day), the **free tier** should be sufficient initially.

---

## Testing Plan

### Unit Tests
**File:** `tests/unit/voice/`

| Test | Validates |
|------|-----------|
| `initiateCall` creates call + participants | DB state correct |
| `answerCall` transitions RINGING → ACTIVE | Status + timestamp set |
| `declineCall` by all participants → DECLINED | Final status correct |
| `endCall` sets duration correctly | `endedAt - startedAt` math |
| Call timeout after 30s → MISSED | Cron or client-side check |
| Non-channel-member cannot initiate call | Auth check via `requireChannelAccess` |
| Token generation returns valid JWT | Decodable, correct room name |

### Manual Testing Matrix

| Scenario | Chrome Desktop | Safari Desktop | Chrome Android | Safari iOS (PWA) |
|----------|---------------|----------------|----------------|------------------|
| 1-on-1 call (initiate) | | | | |
| 1-on-1 call (receive) | | | | |
| Group call (3 participants) | | | | |
| Mute/unmute | | | | |
| Network interruption | | | | |
| Push notification (tab closed) | | | | |
| Decline call | | | | |
| Missed call (timeout) | | | | |

### Known iOS Safari Issues to Test
1. Microphone permission prompt timing
2. Audio routing (speaker vs earpiece)
3. Echo cancellation quality
4. PWA push notification delivery reliability
5. Background audio when switching apps

---

## Week-by-Week Schedule

| Week | Deliverable | Key Files |
|------|-------------|-----------|
| 1 | LiveKit account + env vars + dependencies + Prisma migration + `lib/voice/livekit.ts` | Schema, .env, package.json |
| 2 | Server actions + API routes + call polling endpoint | `server/actions/voice.ts`, `app/api/voice/` |
| 3 | VoiceCallProvider + call button in header + incoming call overlay | `components/voice/`, `ChatHeader.tsx` |
| 4 | Active call screen with LiveKit + push notifications for calls | `ActiveCallScreen.tsx`, `notify.ts`, `sw.js` |
| 5 | Group call support + participant management | `CallParticipantList.tsx` |
| 6 | Call history + missed call badges + timeout logic | `CallHistory.tsx`, badge query |
| 7 | Cross-browser testing + iOS Safari fixes + edge cases | Test matrix |
| 8 | Polish, accessibility, performance optimization | All files |

---

## Decision Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Voice SDK provider | LiveKit | Open-source, React SDK, free tier, SFU included |
| Real-time for call signaling | Polling (3s) + push notifications | Matches existing architecture. No need to add WebSockets for MVP. Polling is sufficient because call state changes are infrequent (ring/answer/end). |
| Call history storage | In VoiceCall table + system ChatMessage | Dual: structured data for queries + visible in chat timeline |
| Call timeout | 30 seconds | Matches Telegram/WhatsApp behavior |
| Ringtone | Browser Audio API | Only works when tab is open. Push notification vibration pattern for background. |
| Group call architecture | LiveKit SFU (no change needed) | LiveKit handles all routing. Same code as 1-on-1, just more participants. |
| Video calls | Out of scope for MVP | Can be added later by enabling video tracks in LiveKit room. Same infrastructure. |
