"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { RequestType } from "@prisma/client";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import { Card, CardDescription, CardTitle, InteractiveCard } from "@/components/ui/Card";
import { createRequest } from "@/server/actions/requests";
import { REQUEST_TYPE_OPTIONS } from "@/lib/requests/utils";
import { cn } from "@/lib/ui/cn";
import { useTranslations } from "@/lib/i18n/provider";

const summaryDefaults: Partial<Record<RequestType, string>> = {
  CONFESSION: "Confession request",
  TALK_TO_PRIEST: "Request to talk with a priest",
  PRAYER: "Prayer request",
  GENERIC: "General request"
};

const requestTypeStyles: Partial<Record<RequestType, string>> = {
  CONFESSION: "border-l-4 border-l-emerald-400 bg-emerald-50/40",
  TALK_TO_PRIEST: "border-l-4 border-l-sky-400 bg-sky-50/40",
  PRAYER: "border-l-4 border-l-amber-400 bg-amber-50/40",
  GENERIC: "border-l-4 border-l-violet-400 bg-violet-50/40"
};

type RequestCreateFlowProps = {
  defaultName?: string;
  defaultEmail?: string;
};

export default function RequestCreateFlow({
  defaultName = "",
  defaultEmail = ""
}: RequestCreateFlowProps) {
  const t = useTranslations();
  const [selectedType, setSelectedType] = useState<RequestType | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const selectedCopy = useMemo(
    () => REQUEST_TYPE_OPTIONS.find((option) => option.value === selectedType) ?? null,
    [selectedType]
  );

  const requestTypeCopy = useMemo(
    () =>
      REQUEST_TYPE_OPTIONS.map((option) => ({
        ...option,
        label: t(`requests.type.${option.value}.label`),
        description: t(`requests.type.${option.value}.description`)
      })),
    [t]
  );

  if (submitted) {
    return (
      <Card className="space-y-4">
        <div className="space-y-2">
          <CardTitle>{t("requests.create.receivedTitle")}</CardTitle>
          <CardDescription>
            {t("requests.create.receivedDescription")}
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/requests"
            className="inline-flex items-center justify-center rounded-button bg-primary-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-600 focus-ring"
          >
            {t("requests.create.viewMyRequests")}
          </Link>
          <Button variant="secondary" onClick={() => {
            setSubmitted(false);
            setSelectedType(null);
            setErrorMessage(null);
          }}>
            {t("requests.create.makeAnother")}
          </Button>
        </div>
      </Card>
    );
  }

  if (!selectedType) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-ink-900">{t("requests.create.chooseType")}</h2>
          <p className="text-sm text-ink-500">{t("requests.create.chooseTypeDescription")}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {requestTypeCopy.map((option) => (
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

  const showPreferredTime =
    selectedType === "CONFESSION" || selectedType === "TALK_TO_PRIEST" || selectedType === "GENERIC";
  const showNotes = true;
  const notesLabel = t("requests.create.details");
  const notesHelper =
    selectedType === "CONFESSION"
      ? "Keep it brief and avoid sensitive confessional details."
      : selectedType === "TALK_TO_PRIEST"
      ? "Share a brief overview so we can prepare (avoid sensitive confessional details)."
      : selectedType === "GENERIC"
        ? "Briefly describe your need — e.g., home blessing, car blessing, meeting."
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
              router.refresh();
              setSubmitted(true);
              return;
            }
            setErrorMessage(result.message ?? t("requests.errors.generic"));
          });
        }}
      >
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">{t("requests.create.step2")}</p>
          <h2 className="text-lg font-semibold text-ink-900">{selectedType ? t(`requests.type.${selectedType}.label`) : selectedCopy?.label}</h2>
          <p className="text-sm text-ink-500">{selectedType ? t(`requests.type.${selectedType}.description`) : selectedCopy?.description}</p>
        </div>

        {errorMessage ? (
          <div className="rounded-card border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="space-y-2">
          <label className="text-sm font-medium text-ink-700" htmlFor="requester-name">
            {t("requests.create.yourName")}
          </label>
          <Input
            id="requester-name"
            name="requesterName"
            placeholder={t("requests.create.fullNamePlaceholder")}
            defaultValue={defaultName}
            autoComplete="name"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-ink-700" htmlFor="requester-email">
            {t("requests.create.email")}
          </label>
          <Input
            id="requester-email"
            name="requesterEmail"
            type="email"
            placeholder={t("requests.create.emailPlaceholder")}
            defaultValue={defaultEmail}
            autoComplete="email"
            required
          />
          <p className="text-xs text-ink-500">{t("requests.create.emailHelper")}</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-ink-700" htmlFor="requester-phone">
            {t("requests.create.phoneOptional")}
          </label>
          <Input
            id="requester-phone"
            name="requesterPhone"
            type="tel"
            placeholder={t("requests.create.phonePlaceholder")}
            autoComplete="tel"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-ink-700" htmlFor="request-title">
            {t("requests.create.summary")}
          </label>
          <Input
            id="request-title"
            name="title"
            placeholder={t("requests.create.summaryPlaceholder")}
            defaultValue={selectedType ? t(`requests.type.${selectedType}.defaultSummary`) : summaryDefaults[selectedType] ?? ""}
            required
          />
        </div>

        {showPreferredTime ? (
          <div className="space-y-2">
            <label className="text-sm font-medium text-ink-700" htmlFor="request-time">
              {t("requests.create.preferredTimeOptional")}
            </label>
            <Input
              id="request-time"
              name="preferredTimeWindow"
              placeholder={t("requests.create.preferredTimePlaceholder")}
            />
            {selectedType === "CONFESSION" ? (
              <p className="text-xs text-ink-500">
                {t("requests.create.preferredTimeHelper")}
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
              name="description"
              rows={4}
              minLength={15}
              placeholder={t("requests.create.detailsPlaceholder")}
              required
            />
            <p className="text-xs text-ink-500">{selectedType ? t(`requests.create.notesHelper.${selectedType}`) : notesHelper}</p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setSelectedType(null)}
          >
            {t("common.back")}
          </Button>
          <Button type="submit" isLoading={isPending}>
            {t("requests.create.submit")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
