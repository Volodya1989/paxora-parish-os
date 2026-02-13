"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import ParishionerRequestDialog from "@/components/requests/ParishionerRequestDialog";

type ParishionerRequestButtonProps = {
  canRequest: boolean;
  requesterEmail: string;
  contextType: "GROUP" | "EVENT" | "SERVE_PUBLIC_TASK";
  contextId?: string;
  contextTitle?: string;
  className?: string;
};

export default function ParishionerRequestButton({
  canRequest,
  requesterEmail,
  contextType,
  contextId,
  contextTitle,
  className
}: ParishionerRequestButtonProps) {
  const [open, setOpen] = useState(false);

  if (!canRequest) {
    return null;
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} className={className ?? "hidden h-9 px-3 text-sm sm:inline-flex"}>
        Request
      </Button>
      <ParishionerRequestDialog
        open={open}
        onOpenChange={setOpen}
        requesterEmail={requesterEmail}
        contextType={contextType}
        contextId={contextId}
        contextTitle={contextTitle}
      />
    </>
  );
}
