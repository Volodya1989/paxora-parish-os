"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import SectionTitle from "@/components/ui/SectionTitle";
import { buildLocalePathname } from "@/lib/i18n/routing";
import { useLocale, useTranslations } from "@/lib/i18n/provider";

export default function SignInPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const resetSuccess = searchParams.get("reset") === "success";
  const resetRequested = searchParams.get("reset") === "requested";
  const verifySent = searchParams.get("verify") === "sent";
  const verifySuccess = searchParams.get("verify") === "success";

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false
    });

    if (result?.error) {
      setError("Invalid email or password.");
      setLoading(false);
      return;
    }

    window.location.href = buildLocalePathname(locale, "/post-login");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-mist-50/60 px-4 py-12">
      <Card className="w-full max-w-md">
        <SectionTitle title={t("nav.signIn")} subtitle="Welcome back to Paxora." />
        <p className="mt-3 text-sm text-ink-500">
          Enter your parish account details to continue.
        </p>
        <form className="mt-6 space-y-5" onSubmit={onSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-ink-700" htmlFor="email">
              Email
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-ink-700" htmlFor="password">
              Password
            </label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <div className="text-right">
              <a
                className="text-xs text-ink-600 underline"
                href={buildLocalePathname(locale, "/forgot-password")}
              >
                Forgot password?
              </a>
            </div>
          </div>
          {resetSuccess ? (
            <p className="text-sm text-emerald-600">Password updated. Please sign in.</p>
          ) : null}
          {resetRequested ? (
            <p className="text-sm text-emerald-600">
              If an account exists for that email, we sent a reset link.
            </p>
          ) : null}
          {verifySent ? (
            <p className="text-sm text-emerald-600">
              Check your email for a verification link to finish setup.
            </p>
          ) : null}
          {verifySuccess ? (
            <p className="text-sm text-emerald-600">
              Email verified. You can now request parish access.
            </p>
          ) : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button className="w-full" type="submit" isLoading={loading}>
            {t("nav.signIn")}
          </Button>
        </form>
        <p className="mt-4 text-sm text-ink-500">
          New here?{" "}
          <a className="text-ink-900 underline" href={buildLocalePathname(locale, "/sign-up")}>
            Create an account
          </a>
          .
        </p>
      </Card>
    </main>
  );
}
