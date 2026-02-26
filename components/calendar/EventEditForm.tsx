"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import EventForm from "@/components/calendar/EventForm";
import EventRecurrenceScopeDialog, {
  type RecurrenceScope
} from "@/components/calendar/EventRecurrenceScopeDialog";
import { updateEvent } from "@/server/actions/events";
import { initialEventActionState } from "@/server/actions/eventState";
import type { EventDetail } from "@/lib/queries/events";
import { useTranslations } from "@/lib/i18n/provider";

type EventEditFormProps = {
  event: EventDetail;
  groupOptions: Array<{ id: string; name: string }>;
  canCreatePublicEvents: boolean;
  canCreatePrivateEvents: boolean;
  canCreateGroupEvents: boolean;
};

export default function EventEditForm({
  event,
  groupOptions,
  canCreatePublicEvents,
  canCreatePrivateEvents,
  canCreateGroupEvents
}: EventEditFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const [scope, setScope] = useState<RecurrenceScope>("THIS_EVENT");
  const [scopeOpen, setScopeOpen] = useState(event.isRecurring);

  return (
    <>
      <EventRecurrenceScopeDialog
        open={scopeOpen}
        onClose={() => router.push("/calendar")}
        onConfirm={() => setScopeOpen(false)}
        scope={scope}
        onScopeChange={setScope}
        mode="edit"
      />
      <EventForm
        event={event}
        action={updateEvent}
        initialState={initialEventActionState}
        onCancel={() => router.push("/calendar")}
        onSuccess={() => router.push("/calendar")}
        successTitle={t("eventEditForm.successTitle")}
        successDescription={t("eventEditForm.successDescription")}
        submitLabel={t("eventEditForm.submitLabel")}
        groupOptions={groupOptions}
        canCreatePublicEvents={canCreatePublicEvents}
        canCreatePrivateEvents={canCreatePrivateEvents}
        canCreateGroupEvents={canCreateGroupEvents}
        scope={scope}
        occurrenceStartsAt={event.startsAt.toISOString()}
      />
    </>
  );
}
