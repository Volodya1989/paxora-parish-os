# Claude Review Prompt — Paxora Critical Security/Privacy Changes (R1, R3, R5)

You are reviewing the current branch implementation in the Paxora repository.

## Objective
Perform a **targeted critical review** of the implemented launch-blocker fixes and identify any remaining **critical gaps**. If critical gaps exist, provide **minimal, practical fixes** (no over-engineering).

## Scope (must review)
1. **R1 — Cron auth protection**
   - `lib/cron/auth.ts`
   - `app/api/cron/archive-completed-requests/route.ts`
   - `app/api/cron/archive-completed-tasks/route.ts`
   - `app/api/cron/event-reminders/route.ts`
   - `app/api/cron/request-reminders/route.ts`
   - `app/api/cron/weekly-digest/route.ts`

2. **R3 — listGroups visibility leak fix**
   - `server/actions/groups.ts` (specifically `listGroups`)

3. **R5 — Push content sanitization**
   - `lib/push/notify.ts` (specifically `notifyChatMessage`)

4. **Status alignment in audit doc**
   - `docs/MVP_READINESS_AUDIT.md`

## Review requirements
- Validate that R1/R3/R5 are **actually closed** in implementation, not just in documentation.
- Focus on high-impact risks only:
  - Auth bypass possibilities
  - Data leakage / privacy leakage
  - Role/visibility regression
  - Obvious production-breaker logic flaws
- Do **not** propose broad refactors or architectural rewrites.
- Do **not** over-engineer; prefer smallest safe patch.

## Output format (strict)
Return results in this exact structure:

### 1) Verdict
- `PASS` if no critical gaps remain.
- `FAIL` if one or more critical gaps remain.

### 2) Critical Findings
For each finding include:
- **ID**: `C1`, `C2`, ...
- **Severity**: `CRITICAL` or `HIGH`
- **Why it matters** (1-2 lines)
- **Evidence** (file + line references)
- **Minimal fix** (smallest concrete change)

If none, write: `No critical findings.`

### 3) Minimal Patch Plan (only if FAIL)
- Ordered checklist of the smallest code changes to close each critical finding.
- Keep each item concise and implementation-ready.

### 4) Validation Steps
List exact commands to verify the fixes (lint/tests/targeted checks). Keep it minimal.

## Additional constraints
- Assume this is an MVP branch under time pressure.
- Prioritize correctness and safety over completeness.
- Avoid speculative issues unless strongly supported by code evidence.
- If a non-critical issue is found, put it in a short “Non-blocking notes” section (max 3 bullets).
