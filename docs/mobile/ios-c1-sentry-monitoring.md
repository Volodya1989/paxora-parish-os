# IOS-C1: Sentry Monitoring (Web + iOS Wrapper Context)

## Purpose
Add production-safe error visibility for both standard web sessions and iOS native shell/TestFlight sessions.

> Note: this repository currently vendors `@sentry/nextjs` under `vendor/sentry-nextjs`. The vendored runtime forwards envelopes to Sentry DSN endpoints (non-no-op) and preserves IOS-C1 shell tags.

## Required environment variables
- `SENTRY_DSN` (server runtime DSN)
- `NEXT_PUBLIC_SENTRY_DSN` (browser runtime DSN)
- `SENTRY_ENVIRONMENT` and `NEXT_PUBLIC_SENTRY_ENVIRONMENT` (for filtering; e.g. `production`, `staging`)
- `SENTRY_RELEASE` and `NEXT_PUBLIC_SENTRY_RELEASE` (release identifier for correlation)

Optional:
- `SENTRY_TRACES_SAMPLE_RATE`
- `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE`

Recommended low-risk defaults:
- Keep trace sample rate at `0` unless performance tracing is required.
- Keep Sentry auth/upload variables unset unless you are uploading source maps in CI.

## Where iOS wrapper tags are set
- `lib/monitoring/sentry-shell-context.ts` defines stable, queryable tags:
  - `app_platform`
  - `app_shell`
  - `app_mode`
- Runtime initialization files apply these tags on every event:
  - `sentry.client.config.ts`
  - `sentry.server.config.ts`
  - `sentry.edge.config.ts`
- `app/global-error.tsx` captures top-level client render crashes and forwards them to Sentry in App Router.

Tag values used by this story:
- iOS wrapper / TestFlight path:
  - `app_platform=ios`
  - `app_shell=native_wrapper`
  - `app_mode=testflight_wrapper`
- Standard web/PWA path:
  - `app_platform=web`
  - `app_shell=browser`
  - `app_mode=web`

## Verification checklist (including TestFlight)
1. Deploy with Sentry DSNs configured.
2. In a TestFlight build, trigger a controlled test error in a non-critical flow (for example, throw from a test-only screen and let `app/global-error.tsx` report it).
3. Confirm event appears in Sentry with tags:
   - `app_platform=ios`
   - `app_shell=native_wrapper`
   - `app_mode=testflight_wrapper`
4. Repeat from standard browser and confirm web tag set.

## Rollout notes
1. Configure env vars in staging first and verify tagged events.
2. Promote same config to production/TestFlight pipeline.
3. Monitor volume for 24 hours and adjust trace sample rate only if needed.

## Rollback notes
- Fast rollback: unset `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN`.
- Effect: instrumentation remains loaded but disabled (`enabled: false`), so app behavior remains stable and events stop sending.
