"use client";

import { useRouter } from "next/navigation";
import EventForm from "@/components/calendar/EventForm";
import { updateEvent } from "@/server/actions/events";
import { initialEventActionState } from "@/server/actions/eventState";
import type { EventDetail } from "@/lib/queries/events";

const copy = {
  title: "Event updated",
  description: "Your changes are saved to the calendar."
};

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
  const router = useRouter();

  return (
    <EventForm
      event={event}
      action={updateEvent}
      initialState={initialEventActionState}
      onCancel={() => router.push("/calendar")}
      onSuccess={() => router.push("/calendar")}
      successTitle={copy.title}
      successDescription={copy.description}
      submitLabel="Save changes"
      groupOptions={groupOptions}
      canCreatePublicEvents={canCreatePublicEvents}
      canCreatePrivateEvents={canCreatePrivateEvents}
      canCreateGroupEvents={canCreateGroupEvents}
    />
  );
}
