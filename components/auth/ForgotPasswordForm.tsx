"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { requestPasswordReset } from "@/app/actions/password";

type PasswordResetRequestState = {
  success?: boolean;
  error?: string;
};

const initialState: PasswordResetRequestState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button className="w-full" type="submit" isLoading={pending}>
      Send reset link
    </Button>
  );
}

export default function ForgotPasswordForm() {
  const [state, formAction] = useActionState(requestPasswordReset, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      router.replace("/sign-in?reset=requested");
    }
  }, [router, state.success]);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-ink-700" htmlFor="email">
          Email
        </label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.success ? (
        <p className="text-sm text-ink-500">Redirecting you to sign in…</p>
      ) : null}
      <SubmitButton />
    </form>
  );
}
