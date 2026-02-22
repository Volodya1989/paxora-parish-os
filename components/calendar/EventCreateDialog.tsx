"use client";

import { useId } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import EventForm from "@/components/calendar/EventForm";
import { createEvent } from "@/server/actions/events";
import { initialEventActionState } from "@/server/actions/eventState";
import { useTranslations } from "@/lib/i18n/provider";

type EventCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupOptions: Array<{ id: string; name: string }>;
  canCreatePublicEvents: boolean;
  canCreatePrivateEvents: boolean;
  canCreateGroupEvents: boolean;
  defaultType?: "SERVICE" | "EVENT";
};

export default function EventCreateDialog({
  open,
  onOpenChange,
  groupOptions,
  canCreatePublicEvents,
  canCreatePrivateEvents,
  canCreateGroupEvents,
  defaultType
}: EventCreateDialogProps) {
  const t = useTranslations();
  const modalId = useId();
  const drawerId = useId();

  const renderForm = (formId: string) => (
    <EventForm
      key={formId}
      action={createEvent}
      initialState={initialEventActionState}
      onCancel={() => onOpenChange(false)}
      onSuccess={() => onOpenChange(false)}
      successTitle={t("eventCreateDialog.successTitle")}
      successDescription={t("eventCreateDialog.successDescription")}
      submitLabel={t("eventCreateDialog.submitLabel")}
      groupOptions={groupOptions}
      canCreatePublicEvents={canCreatePublicEvents}
      canCreatePrivateEvents={canCreatePrivateEvents}
      canCreateGroupEvents={canCreateGroupEvents}
      defaultType={defaultType}
    />
  );

  return (
    <>
      <Modal open={open} onClose={() => onOpenChange(false)} title={t("eventCreateDialog.title")}>
        <p className="mb-4 text-sm text-ink-500">{t("eventCreateDialog.description")}</p>
        {renderForm(modalId)}
      </Modal>
      <Drawer open={open} onClose={() => onOpenChange(false)} title={t("eventCreateDialog.title")}>
        <p className="mb-4 text-sm text-ink-500">{t("eventCreateDialog.description")}</p>
        {renderForm(drawerId)}
      </Drawer>
    </>
  );
}
