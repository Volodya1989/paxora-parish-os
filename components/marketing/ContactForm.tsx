"use client";

import { useActionState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import { submitMarketingContact } from "@/server/actions/marketing/contact";

type ContactActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const initialState: ContactActionState = { status: "idle" };

export default function ContactForm({
  labels
}: {
  labels: {
    name: string;
    parish: string;
    email: string;
    message: string;
    submit: string;
  };
}) {
  const [state, formAction, pending] = useActionState(submitMarketingContact, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-card border border-mist-200 bg-white p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium text-ink-700">{labels.name}</label>
          <Input id="name" name="name" required />
        </div>
        <div className="space-y-2">
          <label htmlFor="parish" className="text-sm font-medium text-ink-700">{labels.parish}</label>
          <Input id="parish" name="parish" required />
        </div>
      </div>
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-ink-700">{labels.email}</label>
        <Input id="email" type="email" name="email" required />
      </div>
      <div className="space-y-2">
        <label htmlFor="message" className="text-sm font-medium text-ink-700">{labels.message}</label>
        <Textarea id="message" name="message" required minLength={10} />
      </div>
      {state.status !== "idle" && state.message ? (
        <p className={state.status === "success" ? "text-sm text-emerald-700" : "text-sm text-rose-700"}>{state.message}</p>
      ) : null}
      <Button type="submit" isLoading={pending}>{labels.submit}</Button>
    </form>
  );
}
