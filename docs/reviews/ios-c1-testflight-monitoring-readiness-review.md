# iOS-C1 TestFlight Monitoring Readiness Review

Verdict: **NO-GO**.

Primary blocker: the project wires Sentry APIs but depends on a vendored `@sentry/nextjs` stub that implements no-op `init`/capture behavior, so TestFlight events cannot reach Sentry.
