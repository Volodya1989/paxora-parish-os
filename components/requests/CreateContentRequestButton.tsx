"use client";

import { useState } from "react";
import CreateContentRequestDialog from "@/components/requests/CreateContentRequestDialog";
import { useTranslations } from "@/lib/i18n/provider";

export type GroupOption = { id: string; name: string };

type Props = {
  canRequest: boolean;
  sourceScreen: "serve" | "groups" | "events";
  groupOptions?: GroupOption[];
  className?: string;
};

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export default function CreateContentRequestButton({
  canRequest,
  sourceScreen,
  groupOptions = [],
  className
}: Props) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);

  if (!canRequest) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("requests.createContent.addAria")}
        className={className ?? "flex h-11 min-w-11 items-center justify-center rounded-full bg-primary-600 px-0 text-white shadow-sm transition hover:bg-primary-700"}
      >
        <PlusIcon />
      </button>
      <CreateContentRequestDialog
        open={open}
        onOpenChange={setOpen}
        sourceScreen={sourceScreen}
        groupOptions={groupOptions}
      />
    </>
  );
}
