# Delivery Failure Retry Guidance

Use the **Admin → Reliability** page (`/admin/reliability`) to triage failed sends.

## Common failure causes

- **Email**
  - Missing/invalid `RESEND_API_KEY`
  - Invalid sender setup (`EMAIL_FROM`/domain verification)
  - Recipient mailbox rejection (hard bounce)
- **Push**
  - Expired subscriptions (410/404)
  - Missing VAPID keys (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`)
  - Browser/device permissions revoked

## First checks for operators

1. Confirm environment variables are present in deployment.
2. Confirm provider dashboards (Resend + push delivery telemetry) show healthy status.
3. Confirm parish sender and recipient details in the failure row.
4. For push failures, ask user to re-enable notifications and re-subscribe from Profile.

## Retry workflow

1. Fix root cause first (config, sender, permissions, recipient correction).
2. Re-run the initiating user action (announcement publish, request status action, etc.).
3. Validate in **Admin → Reliability** that new attempts are successful.
4. If repeated failures continue for >30 minutes, escalate as P1 support incident.
