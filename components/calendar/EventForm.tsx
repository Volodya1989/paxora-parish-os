"use client";

import {
  useActionState,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition
} from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import SelectMenu from "@/components/ui/SelectMenu";
import Textarea from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import type { CalendarEvent, EventDetail } from "@/lib/queries/events";
import type { EventActionState } from "@/server/actions/eventState";

const pad = (value: number) => `${value}`.padStart(2, "0");

function formatDateInput(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatTimeInput(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

type EventFormProps = {
  event?: EventDetail | CalendarEvent | null;
  action: (state: EventActionState, formData: FormData) => Promise<EventActionState>;
  initialState: EventActionState;
  onCancel?: () => void;
  onSuccess?: () => void;
  successTitle: string;
  successDescription: string;
  submitLabel: string;
  groupOptions: Array<{ id: string; name: string }>;
  canCreatePublicEvents: boolean;
  canCreatePrivateEvents: boolean;
  canCreateGroupEvents: boolean;
  defaultType?: "SERVICE" | "EVENT";
};

export default function EventForm({
  event,
  action,
  initialState,
  onCancel,
  onSuccess,
  successTitle,
  successDescription,
  submitLabel,
  groupOptions,
  canCreatePublicEvents,
  canCreatePrivateEvents,
  canCreateGroupEvents,
  defaultType = "EVENT"
}: EventFormProps) {
  const { addToast } = useToast();
  const router = useRouter();
  const [state, formAction] = useActionState<EventActionState, FormData>(
    action,
    initialState
  );
  const handledSuccess = useRef(false);
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const titleId = useId();
  const dateId = useId();
  const startTimeId = useId();
  const endTimeId = useId();
  const locationId = useId();
  const summaryId = useId();
  const visibilityId = useId();
  const groupId = useId();
  const typeId = useId();

  const initialDateValue = useMemo(() => {
    if (event?.startsAt) {
      return formatDateInput(event.startsAt);
    }
    return formatDateInput(new Date());
  }, [event]);

  const initialStartTimeValue = useMemo(() => {
    if (event?.startsAt) {
      return formatTimeInput(event.startsAt);
    }
    return "09:00";
  }, [event]);

  const initialEndTimeValue = useMemo(() => {
    if (event?.endsAt) {
      return formatTimeInput(event.endsAt);
    }
    return "10:00";
  }, [event]);

  const [dateValue, setDateValue] = useState(initialDateValue);
  const [startTimeValue, setStartTimeValue] = useState(initialStartTimeValue);
  const [endTimeValue, setEndTimeValue] = useState(initialEndTimeValue);

  const [visibility, setVisibility] = useState<"PUBLIC" | "GROUP" | "PRIVATE">(
    event?.visibility ?? (canCreatePublicEvents ? "PUBLIC" : "GROUP")
  );
  const [selectedGroupId, setSelectedGroupId] = useState(event?.group?.id ?? "");
  const [type, setType] = useState<"SERVICE" | "EVENT">(
    event?.type ?? defaultType
  );

  useEffect(() => {
    setDateValue(initialDateValue);
    setStartTimeValue(initialStartTimeValue);
    setEndTimeValue(initialEndTimeValue);
    setVisibility(event?.visibility ?? (canCreatePublicEvents ? "PUBLIC" : "GROUP"));
    setSelectedGroupId(event?.group?.id ?? "");
    setType(event?.type ?? defaultType);
  }, [
    canCreatePublicEvents,
    defaultType,
    event,
    initialDateValue,
    initialEndTimeValue,
    initialStartTimeValue
  ]);

  useEffect(() => {
    if (visibility === "GROUP" && !selectedGroupId && groupOptions.length > 0) {
      setSelectedGroupId(groupOptions[0].id);
    }
  }, [groupOptions, selectedGroupId, visibility]);

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
      title: successTitle,
      description: successDescription
    });
    formRef.current?.reset();
    onSuccess?.();
    startTransition(() => {
      router.refresh();
    });
  }, [addToast, onSuccess, router, startTransition, state, successDescription, successTitle]);

  const visibilityOptions = useMemo(() => {
    const options: Array<{ value: string; label: string }> = [];

    if (canCreatePublicEvents || event?.visibility === "PUBLIC") {
      options.push({
        value: "PUBLIC",
        label: "Public (visible to the whole parish)"
      });
    }

    if (canCreateGroupEvents || event?.visibility === "GROUP") {
      options.push({
        value: "GROUP",
        label: "Group (visible only to a specific group)"
      });
    }

    if (canCreatePrivateEvents || event?.visibility === "PRIVATE") {
      options.push({
        value: "PRIVATE",
        label: "Private (leaders only)"
      });
    }

    return options;
  }, [
    canCreateGroupEvents,
    canCreatePrivateEvents,
    canCreatePublicEvents,
    event?.visibility
  ]);

  return (
    <form ref={formRef} className="space-y-4" action={formAction}>
      {event?.id ? <input type="hidden" name="eventId" value={event.id} /> : null}
      <div className="space-y-2">
        <Label htmlFor={titleId}>Title</Label>
        <Input
          id={titleId}
          name="title"
          placeholder="e.g. Divine Liturgy"
          defaultValue={event?.title ?? ""}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={typeId}>Type</Label>
        <SelectMenu
          id={typeId}
          name="type"
          value={type}
          onValueChange={(value) => setType(value as "SERVICE" | "EVENT")}
          options={[
            { value: "SERVICE", label: "Service / Liturgy" },
            { value: "EVENT", label: "Event / Gathering" }
          ]}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor={dateId}>Date</Label>
          <Input
            id={dateId}
            type="date"
            value={dateValue}
            onChange={(eventValue) => setDateValue(eventValue.currentTarget.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={startTimeId}>Start time</Label>
          <Input
            id={startTimeId}
            type="time"
            value={startTimeValue}
            onChange={(eventValue) => setStartTimeValue(eventValue.currentTarget.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={endTimeId}>End time</Label>
          <Input
            id={endTimeId}
            type="time"
            value={endTimeValue}
            onChange={(eventValue) => setEndTimeValue(eventValue.currentTarget.value)}
            required
          />
        </div>
      </div>

      <input type="hidden" name="date" value={dateValue} />
      <input type="hidden" name="startTime" value={startTimeValue} />
      <input type="hidden" name="endTime" value={endTimeValue} />

      <div className="space-y-2">
        <Label htmlFor={locationId}>Location</Label>
        <Input
          id={locationId}
          name="location"
          placeholder="Sanctuary, parish hall, livestream"
          defaultValue={event?.location ?? ""}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={summaryId}>Summary</Label>
        <Textarea
          id={summaryId}
          name="summary"
          placeholder="Add a short description for the schedule view."
          rows={4}
          defaultValue={event?.summary ?? ""}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={visibilityId}>Visibility</Label>
        <SelectMenu
          id={visibilityId}
          name="visibility"
          value={visibility}
          onValueChange={(value) => setVisibility(value as "PUBLIC" | "GROUP" | "PRIVATE")}
          options={visibilityOptions}
        />
        {visibility === "GROUP" ? (
          <p className="text-xs text-ink-400">
            Group-only events appear for members of the selected ministry.
          </p>
        ) : null}
      </div>

      {visibility === "GROUP" ? (
        <div className="space-y-2">
          <Label htmlFor={groupId}>Group</Label>
          <SelectMenu
            id={groupId}
            name="groupId"
            value={selectedGroupId}
            onValueChange={(value) => setSelectedGroupId(value)}
            placeholder={groupOptions.length ? "Select a group" : "No groups available"}
            options={groupOptions.map((group) => ({
              value: group.id,
              label: group.name
            }))}
          />
        </div>
      ) : null}

      {state.status === "error" ? (
        <p role="alert" className="text-sm text-rose-600">
          {state.message}
        </p>
      ) : null}

      <EventFormActions onCancel={onCancel} submitLabel={submitLabel} />
    </form>
  );
}

function EventFormActions({
  onCancel,
  submitLabel
}: {
  onCancel?: () => void;
  submitLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <div className="mt-6 flex justify-end gap-2">
      {onCancel ? (
        <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
      ) : null}
      <Button type="submit" isLoading={pending}>
        {submitLabel}
      </Button>
    </div>
  );
}
