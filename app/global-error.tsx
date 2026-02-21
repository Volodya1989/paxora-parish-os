"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body className="min-h-screen bg-stone-50 text-ink-900">
        <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="text-xl font-semibold">Something went wrong.</h1>
          <p className="text-sm text-ink-600">The issue has been reported. Please try again.</p>
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-md bg-ink-900 px-4 py-2 text-sm font-medium text-white"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
