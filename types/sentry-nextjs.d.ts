declare module "@sentry/nextjs" {
  type Event = { tags?: Record<string, string> };

  export function init(options: {
    dsn?: string;
    enabled?: boolean;
    environment?: string;
    release?: string;
    debug?: boolean;
    tracesSampleRate?: number;
    initialScope?: { tags?: Record<string, string> };
    beforeSend?: (event: Event) => Event | null;
  }): void;

  export function captureException(error: unknown): string;

  export const captureRequestError: (...args: unknown[]) => unknown;

  export function withSentryConfig<T>(nextConfig: T, options: Record<string, unknown>): T;
}
