# Pilot Launch Runbook

## 1) Environment and config checklist

### Auth
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- Credential sign-in users created and password hashes stored.

### Email
- `RESEND_API_KEY`
- `EMAIL_FROM` (or `EMAIL_FROM_DEFAULT`)
- Optional parish sender overrides (`emailFromName`, `emailFromAddress`, `emailReplyTo`).

### Push
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

### Storage
- Required:
  - `CLOUDFLARE_ACCOUNT_ID`
  - `CLOUDFLARE_R2_ACCESS_KEY_ID`
  - `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
  - `CLOUDFLARE_R2_BUCKET`
  - `CLOUDFLARE_R2_ENDPOINT`
- Optional:
  - `CLOUDFLARE_R2_PUBLIC_URL` (for CDN/direct public object URLs)

### Migrations + data
- Run Prisma migrations before app start.
- Seed baseline parish/user data for pilot.

## 2) New parish setup checklist (end-to-end)

1. Create parish (Platform Admin flow).
2. Create or assign initial admin/shepherd user.
3. Confirm membership row exists with expected role.
4. Sign in as parish admin and set active parish.
5. Create one announcement, one event, one task.
6. Verify parishioner account can:
   - view announcement
   - RSVP to event
   - update task/request interactions according to role

## 3) Support intake and triage workflow

### Intake fields
- Parish name
- Reporter role
- URL/page
- Timestamp
- Screenshot/video
- Expected vs actual behavior

### Triage path
1. Classify severity: **P0 blocker**, **P1 degraded**, **P2 improvement**.
2. Check app logs and **Admin → Reliability** for delivery failures.
3. Reproduce with impersonation or test account when possible.
4. Escalate P0/P1 to engineering immediately; attach SQL/log evidence.

## Verification script (fresh environment)

```bash
pnpm install
pnpm prisma migrate deploy
pnpm test
pnpm lint
pnpm build
```

## Pilot smoke checklist (<15 minutes)

Baseline pilot checks (keep as-is):

1. Admin login works.
2. Parish switch/active parish context works.
3. Announcement publish succeeds.
4. Task create + complete succeeds.
5. Event create + RSVP succeeds.
6. Access request submit + approve succeeds.
7. Reliability page loads and displays recent failures (if any).

iOS/TestFlight-specific extension:
- Run `docs/mobile/ios-c4-app-store-qa-smoke-suite.md` for App Store smoke coverage (auth, onboarding, tasks, events, chat upload, giving shortcut policy behavior + evidence template).
- Optional scaffold: `bash scripts/mobile/generate-ios-c4-evidence-template.sh` to generate a dated run-record file.
