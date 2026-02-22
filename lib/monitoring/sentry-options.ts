import { applyShellContextTags, toSentryTags, type ShellContext } from "@/lib/monitoring/sentry-shell-context";

type SentryInitOptions = {
  dsn?: string;
  enabled: boolean;
  environment?: string;
  release?: string;
  debug: false;
  tracesSampleRate: number;
  initialScope: {
    tags: Record<string, string>;
  };
  beforeSend: (event: { tags?: Record<string, string> }) => { tags?: Record<string, string> };
};

export function getSampleRate(value: string | undefined): number {
  const parsed = Number(value ?? "0");
  return Number.isFinite(parsed) ? parsed : 0;
}

export function buildSentryOptions({
  dsn,
  environment,
  release,
  tracesSampleRate,
  shellContext
}: {
  dsn?: string;
  environment?: string;
  release?: string;
  tracesSampleRate: string | undefined;
  shellContext: ShellContext;
}): SentryInitOptions {
  return {
    dsn,
    enabled: Boolean(dsn),
    environment,
    release,
    debug: false,
    tracesSampleRate: getSampleRate(tracesSampleRate),
    initialScope: {
      tags: toSentryTags(shellContext)
    },
    beforeSend(event) {
      return applyShellContextTags(event, shellContext);
    }
  };
}
