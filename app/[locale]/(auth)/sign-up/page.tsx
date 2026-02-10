"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Card from "@/components/ui/Card";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { createUser, type SignUpState } from "@/server/actions/auth";
import { buildLocalePathname } from "@/lib/i18n/routing";
import { useLocale } from "@/lib/i18n/provider";

const initialState: SignUpState = {};

export default function SignUpPage() {
  const [state, formAction] = useActionState(createUser, initialState);
  const router = useRouter();
  const locale = useLocale();
  const [showPassword, setShowPassword] = useState(false);
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const safeReturnTo =
    returnTo && returnTo.startsWith("/") && !returnTo.includes("://") ? returnTo : null;

  useEffect(() => {
    if (state?.success) {
      const base = "/sign-in?verify=sent";
      const nextPath = safeReturnTo
        ? `${base}&returnTo=${encodeURIComponent(safeReturnTo)}`
        : base;
      router.push(buildLocalePathname(locale, nextPath));
    }
  }, [locale, router, safeReturnTo, state?.success]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-mist-50/60 px-4 py-12">
      <Card className="w-full max-w-md">
        <img
          src="/icon.png"
          alt="Paxora logo"
          className="mx-auto mb-5 h-24 w-24 object-contain md:h-28 md:w-28"
        />
        <SectionTitle title="Create account" subtitle="Start with a simple parish setup." />
        <p className="mt-3 text-sm text-ink-500">
          Create your account to begin setting up your parish workspace.
        </p>
        <form className="mt-6 space-y-5" action={formAction}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-ink-700" htmlFor="name">
              Name
            </label>
            <Input id="name" type="text" name="name" autoComplete="name" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-ink-700" htmlFor="email">
              Email
            </label>
            <Input id="email" type="email" name="email" autoComplete="email" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-ink-700" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="new-password"
                minLength={8}
                required
                className="pr-16"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 text-xs font-medium text-ink-500 hover:text-ink-700"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                    <path d="M15.5 15.5 8.5 8.5" />
                    <path d="M9.5 14.5a3.5 3.5 0 0 1 5-5" />
                  </svg>
                ) : (
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                    <circle cx="12" cy="12" r="3.5" />
                  </svg>
                )}
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
          {state?.success ? (
            <p className="text-sm text-emerald-600">
              Account created. Redirecting you to sign in.
            </p>
          ) : null}
          <Button className="w-full" type="submit">
            Create account
          </Button>
        </form>
        <p className="mt-4 text-sm text-ink-500">
          Already have an account?{" "}
          <a
            className="text-ink-900 underline"
            href={buildLocalePathname(
              locale,
              safeReturnTo ? `/sign-in?returnTo=${encodeURIComponent(safeReturnTo)}` : "/sign-in"
            )}
          >
            Sign in
          </a>
          .
        </p>
      </Card>
    </main>
  );
}
