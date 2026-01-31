"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import SectionTitle from "@/components/ui/SectionTitle";
import { acceptParishInvite } from "@/app/actions/parishInvites";
import { buildLocalePathname } from "@/lib/i18n/routing";
import type { Locale } from "@/lib/i18n/config";

type InviteAcceptClientProps = {
  token: string;
  locale: Locale;
};

type InviteStatus = {
  state: "idle" | "loading" | "error";
  message?: string;
};

export default function InviteAcceptClient({ token, locale }: InviteAcceptClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState<InviteStatus>({ state: "idle" });

  useEffect(() => {
    let active = true;

    const run = async () => {
      setStatus({ state: "loading" });
      const result = await acceptParishInvite({ token });
      if (!active) return;
      if (result.status === "error") {
        if (result.error === "NOT_AUTHORIZED") {
          const returnTo = buildLocalePathname(
            locale,
            `/invite/parish?token=${encodeURIComponent(token)}`
          );
          router.replace(
            buildLocalePathname(locale, `/sign-up?returnTo=${encodeURIComponent(returnTo)}`)
          );
          return;
        }
        setStatus({ state: "error", message: result.message });
        return;
      }
      router.replace(buildLocalePathname(locale, "/this-week?invite=accepted"));
    };

    void run();

    return () => {
      active = false;
    };
  }, [locale, router, token]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-mist-50/60 px-4 py-12">
      <Card className="w-full max-w-md">
        <SectionTitle
          title={status.state === "error" ? "Invite issue" : "Accepting invite"}
          subtitle={
            status.state === "error"
              ? "We couldn’t apply this invite."
              : "We’re activating your parish access now."
          }
        />
        <p className="mt-3 text-sm text-ink-500">
          {status.state === "error"
            ? status.message
            : "Please wait while we finish setting up your account."}
        </p>
        {status.state === "error" ? (
          <div className="mt-6 flex flex-wrap gap-2">
            <Button type="button" onClick={() => router.push(buildLocalePathname(locale, "/sign-up"))}>
              Sign up
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push(buildLocalePathname(locale, "/access"))}
            >
              Go to access page
            </Button>
          </div>
        ) : null}
      </Card>
    </main>
  );
}
