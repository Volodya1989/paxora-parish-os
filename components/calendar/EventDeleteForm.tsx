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

const copy = {
  title: "Event removed",
  description: "The event has been removed from the calendar."
};

type EventDeleteFormProps = {
  event: EventDetail;
};

export default function EventDeleteForm({ event }: EventDeleteFormProps) {
  const t = useTranslations();
  const { addToast } = useToast();
  const router = useRouter();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [state, formAction] = useActionState(deleteEvent, initialEventActionState);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const handledSuccess = useRef(false);
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
      title: copy.title,
      description: copy.description,
      status: "success"
    });
    startTransition(() => {
      router.push("/calendar");
      router.refresh();
    });
  }, [addToast, router, startTransition, state]);

  return (
    <form id="event-delete-form" className="space-y-4" action={formAction}>
      <input type="hidden" name="eventId" value={event.id} />
      <p className="text-sm text-ink-500">
        {t("confirm.deleteEventBody")}
      </p>
      {state.status === "error" ? (
        <p role="alert" className="text-sm text-rose-600">
          {state.message}
        </p>
      ) : null}
      <DeleteActions
        onCancel={() => router.push("/calendar")}
        onDeleteRequest={() => setConfirmOpen(true)}
      />

      {isDesktop ? (
        <Modal
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          title={t("confirm.deleteEventTitle")}
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirmOpen(false)}>{t("buttons.cancel")}</Button>
              <Button type="submit" form="event-delete-form" variant="danger">
                {t("confirm.deleteButton")}
              </Button>
            </>
          }
        >
          <p className="text-sm text-ink-600">{t("confirm.deleteEvent")}</p>
        </Modal>
      ) : (
        <Drawer
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          title={t("confirm.deleteEventTitle")}
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirmOpen(false)}>{t("buttons.cancel")}</Button>
              <Button type="submit" form="event-delete-form" variant="danger">
                {t("confirm.deleteButton")}
              </Button>
            </>
          }
        >
          <p className="text-sm text-ink-600">{t("confirm.deleteEvent")}</p>
        </Drawer>
      )}
    </form>
  );
}

function DeleteActions({
  onCancel,
  onDeleteRequest
}: {
  onCancel: () => void;
  onDeleteRequest: () => void;
}) {
  const t = useTranslations();
  const { pending } = useFormStatus();

  return (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
        {t("buttons.cancel")}
      </Button>
      <Button type="button" variant="danger" onClick={onDeleteRequest} disabled={pending}>
        {t("confirm.deleteButton")}
      </Button>
    </div>
  );
}
