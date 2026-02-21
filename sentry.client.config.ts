import * as Sentry from "@sentry/nextjs";
import { buildSentryOptions } from "@/lib/monitoring/sentry-options";
import { getClientShellContext } from "@/lib/monitoring/sentry-shell-context";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const environment = process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV;
const shellContext = getClientShellContext();

Sentry.init(buildSentryOptions({
  dsn,
  environment,
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
  tracesSampleRate: process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
  shellContext
}));
