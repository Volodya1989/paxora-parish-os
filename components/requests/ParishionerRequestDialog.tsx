"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import RequestDialog from "@/components/shared/RequestDialog";
import { submitParishionerContextRequest } from "@/server/actions/requests";

type RequestRecipient = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "SHEPHERD";
};

type ParishionerRequestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requesterEmail: string;
  contextType: "GROUP" | "EVENT" | "SERVE_PUBLIC_TASK";
  contextId?: string;
  contextTitle?: string;
};

export default function ParishionerRequestDialog({
  open,
  onOpenChange,
  requesterEmail,
  contextType,
  contextId,
  contextTitle
}: ParishionerRequestDialogProps) {
  const formId = useId();
  const [recipients, setRecipients] = useState<RequestRecipient[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingRecipients(true);
    fetch("/api/requests/recipients")
      .then((response) => response.json())
      .then((payload) => setRecipients(payload.recipients ?? []))
      .catch(() => setRecipients([]))
      .finally(() => setLoadingRecipients(false));
  }, [open]);

  const helperTitle = useMemo(() => {
    if (!contextTitle) return "";
    return `Regarding: ${contextTitle}`;
  }, [contextTitle]);

  return (
    <RequestDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Request"
      description="Send a request to clergy/admin for support, follow-up, or review."
      successMessage="Your request was submitted successfully. Parish leadership will follow up soon."
      onSubmit={submitParishionerContextRequest}
      submitLabel="Send request"
      renderFields={() => (
        <>
          <input type="hidden" name="contextType" value={contextType} />
          <input type="hidden" name="contextId" value={contextId ?? ""} />
          <input type="hidden" name="contextTitle" value={contextTitle ?? ""} />

          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-from`}>From / Email</Label>
            <Input id={`${formId}-from`} value={requesterEmail} readOnly disabled />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-recipient`}>Send to</Label>
            <Select id={`${formId}-recipient`} name="recipientUserId" required disabled={loadingRecipients || recipients.length === 0}>
              <option value="">{loadingRecipients ? "Loading recipients..." : "Select clergy or admin"}</option>
              {recipients.map((recipient) => (
                <option key={recipient.id} value={recipient.id}>
                  {recipient.name} · {recipient.email} ({recipient.role === "SHEPHERD" ? "Clergy" : "Admin"})
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-title`}>Subject</Label>
            <Input
              id={`${formId}-title`}
              name="title"
              required
              defaultValue={contextTitle ? `Request: ${contextTitle}` : ""}
              placeholder="Briefly describe your request"
            />
            {helperTitle ? <p className="text-xs text-ink-500">{helperTitle}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-message`}>Message</Label>
            <Textarea
              id={`${formId}-message`}
              name="description"
              required
              minLength={15}
              placeholder="Share details so clergy/admin can help."
            />
          </div>
        </>
      )}
    />
  );
}
