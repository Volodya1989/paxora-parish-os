"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { deleteEvent } from "@/server/actions/events";
import { initialEventActionState } from "@/server/actions/eventState";
import type { EventDetail } from "@/lib/queries/events";

const copy = {
  title: "Event removed",
  description: "The event has been removed from the calendar."
};

type EventDeleteFormProps = {
  event: EventDetail;
};

export default function EventDeleteForm({ event }: EventDeleteFormProps) {
  const { addToast } = useToast();
  const router = useRouter();
  const [state, formAction] = useActionState(deleteEvent, initialEventActionState);
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
    <form className="space-y-4" action={formAction}>
      <input type="hidden" name="eventId" value={event.id} />
      <p className="text-sm text-ink-500">
        This cannot be undone. Parishioners will no longer see this event on the schedule.
      </p>
      {state.status === "error" ? (
        <p role="alert" className="text-sm text-rose-600">
          {state.message}
        </p>
      ) : null}
      <DeleteActions onCancel={() => router.push("/calendar")} />
    </form>
  );
}

function DeleteActions({ onCancel }: { onCancel: () => void }) {
  const { pending } = useFormStatus();

  return (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
        Cancel
      </Button>
      <Button type="submit" variant="danger" isLoading={pending}>
        Delete event
      </Button>
    </div>
  );
}
