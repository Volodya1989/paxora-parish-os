"use client";

import { useActionState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import Textarea from "@/components/ui/Textarea";
import {
  createContactSubmission,
  initialContactSubmissionState
} from "@/server/actions/contact";

export default function ContactForm() {
  const [state, formAction] = useActionState(createContactSubmission, initialContactSubmissionState);

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-mist-200 bg-white p-6 shadow-sm">
      <div className="space-y-1">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" placeholder="Your name" required />
        {state.fieldErrors?.name ? <p className="text-xs text-rose-600">{state.fieldErrors.name}</p> : null}
      </div>

      <div className="space-y-1">
        <Label htmlFor="parish">Parish</Label>
        <Input id="parish" name="parish" placeholder="Parish name" required />
        {state.fieldErrors?.parish ? <p className="text-xs text-rose-600">{state.fieldErrors.parish}</p> : null}
      </div>

      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="you@parish.org" required />
        {state.fieldErrors?.email ? <p className="text-xs text-rose-600">{state.fieldErrors.email}</p> : null}
      </div>

      <div className="space-y-1">
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" name="message" rows={5} placeholder="Tell us what you need for your parish pilot." required />
        {state.fieldErrors?.message ? <p className="text-xs text-rose-600">{state.fieldErrors.message}</p> : null}
      </div>

      {state.message ? (
        <p className={state.status === "success" ? "text-sm text-emerald-700" : "text-sm text-rose-600"}>{state.message}</p>
      ) : null}

      <Button type="submit">Send request</Button>
    </form>
  );
}
