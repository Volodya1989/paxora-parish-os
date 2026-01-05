"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import SectionTitle from "@/components/ui/SectionTitle";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

    window.location.href = "/this-week";
  };

  return (
    <Card>
      <SectionTitle title="Sign in" subtitle="Welcome back to Paxora." />
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <label className="block text-sm text-ink-700">
          Email
          <input
            className="mt-1 w-full rounded-md border border-mist-200 bg-white px-3 py-2 text-sm"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="block text-sm text-ink-700">
          Password
          <input
            className="mt-1 w-full rounded-md border border-mist-200 bg-white px-3 py-2 text-sm"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>
      <p className="mt-4 text-sm text-ink-500">
        New here? <a className="text-ink-900 underline" href="/sign-up">Create an account</a>.
      </p>
    </Card>
  );
}
