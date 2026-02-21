import * as Sentry from "@sentry/nextjs";
import { buildSentryOptions } from "@/lib/monitoring/sentry-options";
import { getServerShellContext } from "@/lib/monitoring/sentry-shell-context";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
const environment = process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV;
const shellContext = getServerShellContext();

Sentry.init(buildSentryOptions({
  dsn,
  environment,
  release: process.env.SENTRY_RELEASE,
  tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE,
  shellContext
}));
