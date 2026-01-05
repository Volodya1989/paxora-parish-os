"use client";

import { useFormState } from "react-dom";
import Card from "@/components/ui/Card";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";
import { createUser, type SignUpState } from "@/server/actions/auth";

const initialState: SignUpState = {};

export default function SignUpPage() {
  const [state, formAction] = useFormState(createUser, initialState);

  return (
    <Card>
      <SectionTitle title="Create account" subtitle="Start with a simple parish setup." />
      <form className="mt-6 space-y-4" action={formAction}>
        <label className="block text-sm text-ink-700">
          Name
          <input
            className="mt-1 w-full rounded-md border border-mist-200 bg-white px-3 py-2 text-sm"
            type="text"
            name="name"
            required
          />
        </label>
        <label className="block text-sm text-ink-700">
          Email
          <input
            className="mt-1 w-full rounded-md border border-mist-200 bg-white px-3 py-2 text-sm"
            type="email"
            name="email"
            required
          />
        </label>
        <label className="block text-sm text-ink-700">
          Password
          <input
            className="mt-1 w-full rounded-md border border-mist-200 bg-white px-3 py-2 text-sm"
            type="password"
            name="password"
            minLength={8}
            required
          />
        </label>
        {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
        {state?.success ? (
          <p className="text-sm text-emerald-600">Account created. You can sign in now.</p>
        ) : null}
        <Button type="submit">Create account</Button>
      </form>
      <p className="mt-4 text-sm text-ink-500">
        Already have an account? <a className="text-ink-900 underline" href="/sign-in">Sign in</a>.
      </p>
    </Card>
  );
}
