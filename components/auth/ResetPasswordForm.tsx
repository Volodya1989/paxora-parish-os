"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { resetPassword } from "@/app/actions/password";
import { buildLocalePathname } from "@/lib/i18n/routing";
import { useLocale } from "@/lib/i18n/provider";

type PasswordResetState = {
  success?: boolean;
  error?: string;
};

const initialState: PasswordResetState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button className="w-full" type="submit" isLoading={pending}>
      Reset password
    </Button>
  );
}

export default function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(resetPassword, initialState);
  const router = useRouter();
  const locale = useLocale();

  useEffect(() => {
    if (state.success) {
      router.replace(buildLocalePathname(locale, "/sign-in?reset=success"));
    }
  }, [locale, router, state.success]);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="token" value={token} />
      <div className="space-y-2">
        <label className="text-sm font-medium text-ink-700" htmlFor="password">
          New password
        </label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </div>
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-ink-500">Password updated. Redirecting…</p> : null}
      <SubmitButton />
    </form>
  );
}
