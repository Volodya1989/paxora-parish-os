# Parish Invite Findings

## Existing email utilities
- Email sending uses `sendEmail` / `sendEmailIfAllowed` in `lib/email/emailService.ts`, which logs to `EmailLog` and dispatches via Resend (`lib/email/providers/resend.ts`).【F:lib/email/emailService.ts†L1-L178】
- Template rendering lives under `emails/templates/` and is used by helper wrappers in `lib/email/` (e.g., join requests).【F:emails/templates/joinRequests.ts†L1-L132】【F:lib/email/joinRequests.ts†L1-L129】
- Email logs persist in the `EmailLog` Prisma model with dedupe indices, as defined in `prisma/schema.prisma`.【F:prisma/schema.prisma†L238-L258】

## Existing token conventions
- Token flows hash raw tokens with SHA-256 and store `tokenHash` with `expiresAt` (+ `usedAt` when applicable) for password reset and email verification tokens.【F:app/actions/password.ts†L69-L123】【F:lib/auth/emailVerification.ts†L36-L78】【F:prisma/schema.prisma†L259-L294】

## Current parish resolution & permissions
- Server-side permissions use `requireAdminOrShepherd` (checks membership role in `server/auth/permissions.ts`).【F:server/auth/permissions.ts†L1-L31】
- Active parish is pulled from `session.user.activeParishId` across server actions/pages (e.g., admin people page).【F:app/[locale]/(app)/admin/people/page.tsx†L8-L24】

## Suggested minimal schema additions
- Add a `ParishInvite` model with `parishId`, `email`, `role`, `tokenHash`, `expiresAt`, `acceptedAt`, `revokedAt`, and `invitedByUserId`, following the existing `tokenHash` + `expiresAt` conventions used elsewhere.【F:prisma/schema.prisma†L270-L292】
