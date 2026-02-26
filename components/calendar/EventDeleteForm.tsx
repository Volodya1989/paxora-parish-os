"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import Button from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Drawer } from "@/components/ui/Drawer";
import { useToast } from "@/components/ui/Toast";
import { deleteEvent } from "@/server/actions/events";
import { initialEventActionState } from "@/server/actions/eventState";
import type { EventDetail } from "@/lib/queries/events";
import { useTranslations } from "@/lib/i18n/provider";
import { useMediaQuery } from "@/lib/ui/useMediaQuery";

type EventDeleteFormProps = {
  event: EventDetail;
};

export default function EventDeleteForm({ event }: EventDeleteFormProps) {
  const t = useTranslations();
  const { addToast } = useToast();
  const router = useRouter();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [state, formAction] = useActionState(deleteEvent, initialEventActionState);
  const [confirmOpen, setConfirmOpen] = useState(true);
  const handledSuccess = useRef(false);
  const handledError = useRef<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (state.status !== "success") {
      handledSuccess.current = false;
      return;
    }

    if (handledSuccess.current) {
      return;
    }

    handledSuccess.current = true;
    addToast({
      title: t("eventDelete.toastTitle"),
      description: t("eventDelete.toastDescription"),
      status: "success"
    });
    startTransition(() => {
      router.push("/calendar");
      router.refresh();
    });
  }, [addToast, router, startTransition, state, t]);

  useEffect(() => {
    if (state.status !== "error" || !state.message) {
      handledError.current = null;
      return;
    }

    if (handledError.current === state.message) {
      return;
    }

    handledError.current = state.message;
    addToast({
      title: t("eventDelete.errorToastTitle"),
      description: state.message,
      status: "error"
    });
  }, [addToast, state.message, state.status, t]);

  const handleCancel = () => {
    setConfirmOpen(false);
    startTransition(() => {
      router.back();
    });
  };

  return (
    <form id="event-delete-form" action={formAction}>
      <input type="hidden" name="eventId" value={event.id} />

      {isDesktop ? (
        <Modal
          open={confirmOpen}
          onClose={handleCancel}
          title={t("confirm.deleteEventTitle")}
          footer={
            <DeleteFooter onCancel={handleCancel} />
          }
        >
          <div className="space-y-3">
            <p className="text-sm text-ink-600">{t("confirm.deleteEventBody")}</p>
            <p className="text-xs font-medium text-ink-700">{event.title}</p>
            {state.status === "error" ? (
              <p role="alert" className="text-sm text-rose-600">
                {state.message}
              </p>
            ) : null}
          </div>
        </Modal>
      ) : (
        <Drawer
          open={confirmOpen}
          onClose={handleCancel}
          title={t("confirm.deleteEventTitle")}
          footer={
            <DeleteFooter onCancel={handleCancel} />
          }
        >
          <div className="space-y-3">
            <p className="text-sm text-ink-600">{t("confirm.deleteEventBody")}</p>
            <p className="text-xs font-medium text-ink-700">{event.title}</p>
            {state.status === "error" ? (
              <p role="alert" className="text-sm text-rose-600">
                {state.message}
              </p>
            ) : null}
          </div>
        </Drawer>
      )}
    </form>
  );
}

function DeleteFooter({ onCancel }: {
  onCancel: () => void;
}) {
  const t = useTranslations();
  const { pending } = useFormStatus();

  return (
    <>
      <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>
        {t("buttons.cancel")}
      </Button>
      <Button type="submit" form="event-delete-form" variant="danger" isLoading={pending} disabled={pending}>
        {t("confirm.deleteButton")}
      </Button>
    </>
  );
}
