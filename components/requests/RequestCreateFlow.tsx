"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { RequestType } from "@prisma/client";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import { Card, CardDescription, CardTitle, InteractiveCard } from "@/components/ui/Card";
import { createRequest } from "@/server/actions/requests";
import { REQUEST_TYPE_OPTIONS } from "@/lib/requests/utils";
import { cn } from "@/lib/ui/cn";

const summaryDefaults: Record<RequestType, string> = {
  CONFESSION: "Confession request",
  TALK_TO_PRIEST: "Request to talk with a priest",
  PRAYER: "Prayer request",
  LITURGICAL: "Liturgical support request"
};

const requestTypeStyles: Record<RequestType, string> = {
  CONFESSION: "border-l-4 border-l-emerald-400 bg-emerald-50/40",
  TALK_TO_PRIEST: "border-l-4 border-l-sky-400 bg-sky-50/40",
  PRAYER: "border-l-4 border-l-amber-400 bg-amber-50/40",
  LITURGICAL: "border-l-4 border-l-rose-400 bg-rose-50/40"
};

export default function RequestCreateFlow() {
  const [selectedType, setSelectedType] = useState<RequestType | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selectedCopy = useMemo(
    () => REQUEST_TYPE_OPTIONS.find((option) => option.value === selectedType) ?? null,
    [selectedType]
  );

  if (submitted) {
    return (
      <Card className="space-y-4">
        <div className="space-y-2">
          <CardTitle>Your request has been received.</CardTitle>
          <CardDescription>
            We&apos;ll follow up soon. You can check updates anytime in My Requests.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/requests"
            className="inline-flex items-center justify-center rounded-button bg-primary-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-600 focus-ring"
          >
            View My Requests
          </Link>
          <Button variant="secondary" onClick={() => {
            setSubmitted(false);
            setSelectedType(null);
            setErrorMessage(null);
          }}>
            Make another request
          </Button>
        </div>
      </Card>
    );
  }

  if (!selectedType) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-ink-900">Choose a request type</h2>
          <p className="text-sm text-ink-500">Pick the option that best fits your need.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {REQUEST_TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSelectedType(option.value)}
              className="text-left"
            >
              <InteractiveCard className={cn("space-y-2", requestTypeStyles[option.value])}>
                <CardTitle className="text-base">{option.label}</CardTitle>
                <CardDescription>{option.description}</CardDescription>
              </InteractiveCard>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const showPreferredTime = selectedType === "CONFESSION" || selectedType === "TALK_TO_PRIEST";
  const showNotes = selectedType !== "CONFESSION";
  const notesLabel = selectedType === "TALK_TO_PRIEST" ? "Optional notes" : "Details";
  const notesHelper =
    selectedType === "TALK_TO_PRIEST"
      ? "Keep notes brief and avoid sensitive confessional details."
      : "Share any helpful context (avoid sensitive confessional details).";

  return (
    <Card>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          setErrorMessage(null);
          const formData = new FormData(event.currentTarget);
          formData.set("type", selectedType);
          startTransition(async () => {
            const result = await createRequest(formData);
            if (result.status === "success") {
              setSubmitted(true);
              return;
            }
            setErrorMessage(result.message ?? "Something went wrong. Please try again.");
          });
        }}
      >
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Step 2</p>
          <h2 className="text-lg font-semibold text-ink-900">{selectedCopy?.label}</h2>
          <p className="text-sm text-ink-500">{selectedCopy?.description}</p>
        </div>

        {errorMessage ? (
          <div className="rounded-card border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="space-y-2">
          <label className="text-sm font-medium text-ink-700" htmlFor="request-title">
            Summary
          </label>
          <Input
            id="request-title"
            name="title"
            placeholder="Short summary"
            defaultValue={summaryDefaults[selectedType]}
            required
          />
        </div>

        {showPreferredTime ? (
          <div className="space-y-2">
            <label className="text-sm font-medium text-ink-700" htmlFor="request-time">
              Preferred time window (optional)
            </label>
            <Input
              id="request-time"
              name="preferredTimeWindow"
              placeholder="e.g., Weekday evenings or Saturday morning"
            />
            {selectedType === "CONFESSION" ? (
              <p className="text-xs text-ink-500">
                Please keep details minimal. A preferred time window is enough.
              </p>
            ) : null}
          </div>
        ) : null}

        {showNotes ? (
          <div className="space-y-2">
            <label className="text-sm font-medium text-ink-700" htmlFor="request-notes">
              {notesLabel}
            </label>
            <Textarea
              id="request-notes"
              name="notes"
              rows={4}
              placeholder="Share any helpful context"
            />
            <p className="text-xs text-ink-500">{notesHelper}</p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setSelectedType(null)}
          >
            Back
          </Button>
          <Button type="submit" isLoading={isPending}>
            Submit request
          </Button>
        </div>
      </form>
    </Card>
  );
}
