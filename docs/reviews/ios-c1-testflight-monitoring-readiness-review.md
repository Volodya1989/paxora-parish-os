# iOS-C1 TestFlight Monitoring Readiness Review

Verdict: **GO (pending TestFlight smoke verification)**.

Status update: the previously vendored no-op `@sentry/nextjs` implementation has been replaced with an envelope-sending runtime in `vendor/sentry-nextjs`, so captured exceptions are now forwarded to Sentry when DSNs are configured.
