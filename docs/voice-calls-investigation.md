# Voice Calls Investigation — Paxora Parish OS

**Date:** 2026-02-04
**Branch:** claude/voice-calls-investigation-Uz9wT

## Current State

### Tech Stack
- Next.js 16 (App Router) + React 19 + Prisma 5 + PostgreSQL + Tailwind CSS
- PWA with service worker and Web Push notifications

### Chat System
- Text-only messaging with 3-second polling (`/api/chat/[channelId]/poll`)
- No WebSockets, Socket.io, or persistent real-time connections
- Features: threads, reactions, polls, pinning, read state, swipe-to-reply
- Channel types: PARISH, ANNOUNCEMENT, GROUP
- Push notifications via `web-push` (VAPID)

### What Does NOT Exist
- No WebRTC libraries
- No real-time transport layer (WebSockets/Socket.io)
- No TURN/STUN server configuration
- No media streaming infrastructure
- No audio/video recording or playback
- No call-related database models
- No signaling server

---

## Approach A: Self-Hosted WebRTC

Build from scratch using browser WebRTC APIs with a custom signaling server.

### Components Required

| Component | Description | Effort |
|-----------|-------------|--------|
| WebSocket/Signaling Server | Persistent connections for call signaling. Requires separate Node.js server (Next.js serverless can't do WebSockets). | High |
| TURN/STUN Servers | NAT traversal for peers behind firewalls. Free STUN (Google), paid TURN (Twilio/Xirsys/coturn). | Medium |
| WebRTC Peer Connection | `RTCPeerConnection` API, SDP offer/answer, ICE candidates. Libraries like `simple-peer` help. | High |
| Call State Management | Prisma models: VoiceCall, VoiceCallParticipant, CallHistory. | Medium |
| Call UI Components | Incoming call screen, active call screen, call history, caller ID, in-chat button. | Medium |
| Incoming Call Notifications | Adapt existing web-push for ringing. PWA limitations apply (no ringtone on iOS). | Medium |
| Group Call Support | Requires SFU (mediasoup/Janus). P2P doesn't scale beyond ~4 participants. | Very High |
| Audio Quality | Codec negotiation (Opus), echo cancellation, noise suppression. Browsers handle most. | Medium |

**Pros:** Full control, no per-minute costs, privacy-friendly
**Cons:** Massive engineering effort, TURN server costs, browser compatibility issues, SFU needed for groups

**Estimated effort:** 3–6 months (senior full-stack, 1-on-1 only). +2–3 months for group calls.

---

## Approach B: Third-Party Voice SDK (Recommended)

Use a managed service that handles WebRTC complexity.

### Provider Options

| Service | Pricing | Key Features |
|---------|---------|--------------|
| Twilio Voice | ~$0.004/min | Most mature, PSTN support |
| Agora | 10,000 free min/month | Best for group calls, low latency |
| LiveKit | Open-source or cloud | Modern, WebRTC-native, React SDK |
| Daily.co | 10,000 free min/month | Simplest API, prebuilt UI components |
| Stream | Chat + Video combined | Could replace polling-based chat too |

### Components Still Needed

| Component | Description | Effort |
|-----------|-------------|--------|
| SDK Integration | Install and configure provider's client + server SDK | Low–Medium |
| Call State & History | Database models for call records, missed calls | Medium |
| Call UI Components | Incoming call overlay, active call screen, call button in header | Medium |
| Push Notification for Ringing | Adapt existing web-push for incoming call alerts | Low–Medium |
| WebSocket Layer (Optional) | For real-time signaling events. Could use provider events or add minimal WS. | Medium |

**Estimated effort:** 4–8 weeks (senior full-stack, 1-on-1 + group calls).

---

## Difficulty Assessment

| Factor | Rating | Notes |
|--------|--------|-------|
| Real-time infrastructure | **Gap** | No WebSockets — polling only. Any voice solution needs persistent connections. |
| Push notification foundation | **Partial** | web-push exists but PWA push can't reliably ring like a native app. |
| Database schema readiness | **Gap** | No call-related models. Need new tables. |
| Frontend component maturity | **Good** | Strong patterns from chat UI to extend. |
| Mobile/PWA limitations | **Significant** | No background audio on iOS, no CallKit integration, push can't ring. |
| Serverless hosting constraint | **Significant** | Vercel can't run WebSocket servers. Need separate server or managed service. |

---

## Recommended Implementation Path

### Phase 1 — Foundation (Weeks 1–2)
1. Add real-time transport (Socket.io server or managed service like Pusher/Ably)
2. Create database models: `VoiceCall`, `VoiceCallParticipant`
3. Add call initiation server actions and API routes

### Phase 2 — 1-on-1 Calls (Weeks 3–5)
1. Integrate chosen provider SDK (LiveKit or Daily.co recommended)
2. Build call UI: incoming overlay, active call screen, in-chat call button
3. Adapt push notifications for incoming call alerts
4. Handle lifecycle: ring → answer/decline → active → end

### Phase 3 — Polish & Group Calls (Weeks 6–8)
1. Call history UI and missed call indicators
2. Group voice calls (most SDKs support natively)
3. In-call controls: mute, speaker, add participant
4. Edge cases: network drops, call recovery, simultaneous calls

---

## Key Risks & Constraints

1. **PWA vs Native App** — Biggest constraint. PWA cannot ring like Telegram/WhatsApp. On iOS with browser closed, incoming calls are just regular push notifications — no ringtone, no full-screen UI. This fundamentally limits the Telegram-like experience.

2. **iOS Safari WebRTC** — Works but has known audio routing, echo cancellation, and permission issues. Requires thorough testing.

3. **Infrastructure cost** — TURN servers + voice SDK add $50–300/month for <500 concurrent users.

4. **Serverless incompatibility** — If on Vercel, need managed service (Pusher/Ably) for signaling or a separate server.

5. **Scope creep** — Voice calls lead to requests for video, screen sharing, voicemail. Define MVP upfront.

---

## Proposed Database Schema

```prisma
model VoiceCall {
  id             String                @id @default(cuid())
  channelId      String
  channel        ChatChannel           @relation(fields: [channelId], references: [id])
  initiatorId    String
  initiator      User                  @relation("CallInitiator", fields: [initiatorId], references: [id])
  status         VoiceCallStatus       @default(RINGING)
  startedAt      DateTime?
  endedAt        DateTime?
  createdAt      DateTime              @default(now())
  participants   VoiceCallParticipant[]

  @@index([channelId])
  @@index([initiatorId])
}

model VoiceCallParticipant {
  id        String              @id @default(cuid())
  callId    String
  call      VoiceCall           @relation(fields: [callId], references: [id])
  userId    String
  user      User                @relation(fields: [userId], references: [id])
  joinedAt  DateTime?
  leftAt    DateTime?
  status    CallParticipantStatus @default(INVITED)

  @@unique([callId, userId])
  @@index([userId])
}

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
```

---

## Bottom Line

| Approach | Effort | Monthly Cost | Quality |
|----------|--------|-------------|---------|
| Self-hosted WebRTC | 3–6 months | $50–100 (TURN) | High risk of quality issues |
| **Third-party SDK** | **4–8 weeks** | **$100–300** | **Production-quality from day 1** |

**Recommendation:** Use Approach B with **LiveKit** (open-source) or **Daily.co** (simplest). The codebase has solid foundations — chat UI, push notifications, and component patterns are extensible. The biggest gap is the missing real-time transport layer, which a managed service solves.
