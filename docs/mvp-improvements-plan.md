# Paxora MVP Readiness Improvement Plan

## Purpose
Provide a concise, execution-ready plan to close the highest‑impact gaps before an MVP pilot, with emphasis on **Platform Admin** so each parish can be handled properly.

## MVP Readiness Goal
**Target:** MVP-ready with targeted improvements focused on onboarding, parish management, and reliability of weekly operations.

---

## A) Platform Admin (Priority 0 — MVP Blocking if absent)
**Why it matters:** A pilot across multiple parishes needs centralized control for provisioning, compliance, and rapid support. Parish admins should not be asked to self‑solve platform issues.

### Required Capabilities
1. **Parish Lifecycle Management**
   - Create/disable parish, set active status, assign default locale/timezone.
   - Configure parish identity (name, logo, email domain, contact).
2. **Global User Directory & Support Tools**
   - Search users across parishes.
   - Impersonation (read‑only preferred) for support.
   - Reset access, resend verification, revoke sessions.
3. **Role & Access Governance**
   - Assign parish leadership (Admin/Shepherd) at platform level.
   - Audit role changes and access requests.
4. **Content & Communication Controls**
   - Global email/push health status by parish.
   - Pause announcements for a parish (safety control).
5. **Pilot Safety & Compliance**
   - Data export for a parish (membership, tasks, events).
   - Basic audit log: access grants, role changes, announcement sends.

### Minimum Scope for MVP
- Parish create/disable
- Assign parish leaders
- Global user search + reset access
- Email/push health dashboard (high‑level)

---

## B) Parish Admin Weekly Operating Loop (Priority 1)
**Why it matters:** Real parishes need predictable, low‑friction weekly setup and communication.

### Must‑Have Improvements
1. **Weekly Setup Checklist**
   - Seed This Week: top tasks, key events, announcements, digest draft.
2. **Publish Workflow**
   - Single “Publish This Week” action that confirms: tasks, announcements, digest.
3. **Freshness Guardrails**
   - Warn if no announcements/events/tasks published this week.

---

## C) Onboarding & Access Experience (Priority 1)
**Why it matters:** A parish pilot fails if first‑time users can’t quickly understand how to start or get access.

### Must‑Have Improvements
1. **Parish Onboarding Script**
   - First‑time admin flow: create parish, add leaders, set weekly cadence.
2. **Parishioner Join Flow**
   - Simple join request with clear status and expected response timing.

---

## D) Requests Coverage (Priority 2)
**Why it matters:** Real parishes have needs beyond events (pastoral care, facilities, sacristy needs).

### Minimum Additions
- General **Request Intake** (single flexible form) routed to parish leaders.
- Basic request status tracking (Pending → Approved/Declined).

---

## E) Reliability & Trust (Priority 2)
**Why it matters:** If notifications or digest delivery are unreliable, pilots stall.

### Minimum Improvements
- Email delivery status summary for admins.
- Push notification opt‑in status by user.
- Clear error handling and retry guidance for announcement sends.

---

## MVP Readiness Checklist (Go/No‑Go)
**Go if:**
- Platform Admin exists with parish provisioning + leader assignment.
- Weekly setup workflow is clear and low‑effort.
- Parishioners can request access and receive confirmation.
- Announcements + digest can be reliably sent.

**No‑Go if:**
- No platform admin tools for parish provisioning.
- Weekly setup is unclear or too manual.
- Communication delivery is unreliable or opaque.

---

## Recommended MVP Scope (Include/Exclude)
**Include:**
- This Week, Tasks/Serve, Groups, Calendar, Announcements, Digest, Chat
- Parish Admin People + Role Controls
- Platform Admin (minimum scope above)

**Exclude (for MVP):**
- Advanced analytics, donations, sacramental records, complex hierarchies

---

## 30‑Day Execution Plan (High‑Level)
- **Week 1:** Platform Admin skeleton (parish create/disable, assign leaders).
- **Week 2:** Weekly setup checklist + publish workflow.
- **Week 3:** General request intake + status tracking.
- **Week 4:** Reliability pass (email/push status dashboards + fixes).

---

## Success Criteria for MVP Pilot
- Parish admin can complete weekly setup in **<30 minutes**.
- Parishioners can join and receive updates without training.
- Weekly digest + announcements consistently deliver with minimal support.
- Platform admin can provision a new parish in **<10 minutes**.
