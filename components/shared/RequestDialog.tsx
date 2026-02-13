"use client";

import { useId, useState, type ReactNode } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import RequestSuccessState from "@/components/requests/RequestSuccessState";

export type RequestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  successMessage: ReactNode;
  renderFields: (formId: string) => ReactNode;
  onSubmit?: (formData: FormData) => Promise<{ status: "success" | "error"; message?: string }>;
  submitLabel?: string;
  cancelLabel?: string;
  doneLabel?: string;
  successTitle?: string;
};

type FormState = "form" | "success";

export default function RequestDialog({
  open,
  onOpenChange,
  title,
  description,
  successMessage,
  renderFields,
  onSubmit,
  submitLabel = "Submit request",
  cancelLabel = "Cancel",
  doneLabel = "Done",
  successTitle = "Request submitted"
}: RequestDialogProps) {
  const modalId = useId();
  const drawerId = useId();
  const [formState, setFormState] = useState<FormState>("form");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setFormState("form");
      setErrorMessage(null);
      setIsSubmitting(false);
    }, 300);
  };

  const renderContent = (formId: string) => {
    if (formState === "success") {
      return (
        <RequestSuccessState
          title={successTitle}
          message={successMessage}
          doneLabel={doneLabel}
          onDone={handleClose}
        />
      );
    }

    return (
      <form
        key={formId}
        onSubmit={async (event) => {
          if (!onSubmit) {
            event.preventDefault();
            setFormState("success");
            return;
          }

          event.preventDefault();
          setErrorMessage(null);
          setIsSubmitting(true);

          try {
            const formData = new FormData(event.currentTarget);
            const result = await onSubmit(formData);

            if (result.status === "success") {
              setFormState("success");
            } else {
              setErrorMessage(result.message ?? "Something went wrong. Please try again.");
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";
            setErrorMessage(message);
          } finally {
            setIsSubmitting(false);
          }
        }}
        className="space-y-4"
      >
        <p className="text-sm text-ink-500">{description}</p>
        {errorMessage ? (
          <div className="rounded-card border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        {renderFields(formId)}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            {cancelLabel}
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {submitLabel}
          </Button>
        </div>
      </form>
    );
  };

  const dialogTitle = formState === "success" ? successTitle : title;

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
