"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import ParishionerRequestDialog from "@/components/requests/ParishionerRequestDialog";
import { useTranslations } from "@/lib/i18n/provider";

type ParishionerRequestButtonProps = {
  canRequest: boolean;
  requesterEmail: string;
  sourceScreen: "serve" | "groups" | "events";
  groupOptions: Array<{ id: string; name: string }>;
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

export default function ParishionerRequestButton({
  canRequest,
  requesterEmail,
  sourceScreen,
  groupOptions,
  className
}: ParishionerRequestButtonProps) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);

  if (!canRequest) {
    return null;
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className={className ?? "h-10 w-10 rounded-full px-0"}
        aria-label={t("requests.createContent.addAria")}
      >
        <PlusIcon />
      </Button>
      <ParishionerRequestDialog
        open={open}
        onOpenChange={setOpen}
        requesterEmail={requesterEmail}
        sourceScreen={sourceScreen}
        groupOptions={groupOptions}
      />
    </>
  );
}
