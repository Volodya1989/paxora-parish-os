"use client";

import { useId, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { submitContentReport } from "@/server/actions/content-reports";
import { useToast } from "@/components/ui/Toast";
import { useTranslations } from "@/lib/i18n/provider";

const MIN_REASON_LENGTH = 10;

type ReportContentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType: "CHAT_MESSAGE" | "ANNOUNCEMENT" | "GROUP_CONTENT";
  contentId: string;
};

export default function ReportContentDialog({
  open,
  onOpenChange,
  contentType,
  contentId
}: ReportContentDialogProps) {
  const modalId = useId();
  const drawerId = useId();
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { addToast } = useToast();
  const t = useTranslations();

  const trimmedReason = reason.trim();
  const isValid = trimmedReason.length >= MIN_REASON_LENGTH;

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setReason("");
      setErrorMessage(null);
      setIsSubmitting(false);
    }, 300);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValid) return;

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const result = await submitContentReport({
        contentType,
        contentId,
        reason: trimmedReason
      });

      addToast({
        title: result.duplicate
          ? t("moderation.reportAlreadySubmitted")
          : t("moderation.reportSubmitted"),
        description: result.duplicate
          ? t("moderation.reportAlreadySubmittedDescription")
          : t("moderation.reportSubmittedDescription"),
        status: "success"
      });

      handleClose();
    } catch (error) {
      const message =
        error instanceof Error && error.message === "Reason is required (minimum 10 characters)"
          ? t("moderation.reasonTooShort")
          : t("moderation.reportFailedDescription");
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderContent = (formId: string) => (
    <form id={formId} onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-ink-500">
        {t("moderation.reportDialogDescription")}
      </p>

      {errorMessage ? (
        <div className="rounded-card border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      <div>
        <label htmlFor={`${formId}-reason`} className="mb-1 block text-sm font-medium text-ink-700">
          {t("moderation.reasonLabel")}
        </label>
        <textarea
          id={`${formId}-reason`}
          name="reason"
          rows={4}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder={t("moderation.reasonPlaceholder")}
          className="w-full rounded-card border border-mist-200 px-3 py-2 text-sm text-ink-700 placeholder:text-ink-400 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          maxLength={500}
        />
        <p className="mt-1 text-xs text-ink-400">
          {trimmedReason.length < MIN_REASON_LENGTH
            ? `${trimmedReason.length}/${MIN_REASON_LENGTH} ${t("moderation.charsMinimum")}`
            : `${trimmedReason.length}/500`}
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={handleClose}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={!isValid} isLoading={isSubmitting}>
          {t("moderation.submitReport")}
        </Button>
      </div>
    </form>
  );

  const dialogTitle = t("common.reportContent");

  return (
    <>
      <Modal open={open} onClose={handleClose} title={dialogTitle}>
        {renderContent(modalId)}
      </Modal>
      <Drawer open={open} onClose={handleClose} title={dialogTitle}>
        {renderContent(drawerId)}
      </Drawer>
    </>
  );
}
