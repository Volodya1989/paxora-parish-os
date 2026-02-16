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
import { useTranslations } from "@/lib/i18n/provider";

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
  const t = useTranslations();
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
  const recurrenceId = useId();
  const recurrenceEndsId = useId();
  const recurrenceUntilId = useId();

  const initialDateValue = useMemo(() => {
    if (event?.startsAt) {
      return formatDateInput(event.startsAt);
    }
    // Smart default: next Sunday for SERVICE, today for EVENT
    if (defaultType === "SERVICE") {
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 = Sunday
      const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
      const nextSunday = new Date(now);
      nextSunday.setDate(now.getDate() + daysUntilSunday);
      return formatDateInput(nextSunday);
    }
    return formatDateInput(new Date());
  }, [defaultType, event]);

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

  const initialRecurrence = useMemo(() => {
    if (!event || event.recurrenceFreq === "NONE") {
      return {
        pattern: "NONE" as const,
        days: [] as number[],
        ends: "NEVER" as const,
        until: ""
      };
    }

    const fallbackDay = event.startsAt.getDay();
    const days =
      event.recurrenceFreq === "WEEKLY"
        ? event.recurrenceByWeekday?.length
          ? event.recurrenceByWeekday
          : [fallbackDay]
        : [];
    const pattern =
      event.recurrenceFreq === "DAILY"
        ? "DAILY"
        : days.length > 1
          ? "CUSTOM"
          : "WEEKLY";

    return {
      pattern: pattern as "DAILY" | "WEEKLY" | "CUSTOM",
      days,
      ends: event.recurrenceUntil ? ("ON" as const) : ("NEVER" as const),
      until: event.recurrenceUntil ? formatDateInput(event.recurrenceUntil) : ""
    };
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
  const [recurrencePattern, setRecurrencePattern] = useState<
    "NONE" | "DAILY" | "WEEKLY" | "CUSTOM"
  >(initialRecurrence.pattern);
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>(
    initialRecurrence.days
  );
  const [recurrenceEnds, setRecurrenceEnds] = useState<"NEVER" | "ON">(
    initialRecurrence.ends
  );
  const [recurrenceUntil, setRecurrenceUntil] = useState(initialRecurrence.until);

  useEffect(() => {
    setDateValue(initialDateValue);
    setStartTimeValue(initialStartTimeValue);
    setEndTimeValue(initialEndTimeValue);
    setVisibility(event?.visibility ?? (canCreatePublicEvents ? "PUBLIC" : "GROUP"));
    setSelectedGroupId(event?.group?.id ?? "");
    setType(event?.type ?? defaultType);
    setRecurrencePattern(initialRecurrence.pattern);
    setRecurrenceDays(initialRecurrence.days);
    setRecurrenceEnds(initialRecurrence.ends);
    setRecurrenceUntil(initialRecurrence.until);
  }, [
    canCreatePublicEvents,
    defaultType,
    event,
    initialRecurrence,
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
    if (recurrencePattern === "WEEKLY" || recurrencePattern === "CUSTOM") {
      if (recurrenceDays.length === 0) {
        const parsed = new Date(dateValue);
        if (!Number.isNaN(parsed.getTime())) {
          setRecurrenceDays([parsed.getDay()]);
        }
      }
    }
  }, [dateValue, recurrenceDays.length, recurrencePattern]);

  useEffect(() => {
    if (recurrencePattern === "NONE") {
      setRecurrenceEnds("NEVER");
      setRecurrenceUntil("");
    }
  }, [recurrencePattern]);

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
      description: successDescription,
      status: "success"
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
        label: t("eventForm.visibilityPublic")
      });
    }

    if (canCreateGroupEvents || event?.visibility === "GROUP") {
      options.push({
        value: "GROUP",
        label: t("eventForm.visibilityGroup")
      });
    }

    if (canCreatePrivateEvents || event?.visibility === "PRIVATE") {
      options.push({
        value: "PRIVATE",
        label: t("eventForm.visibilityPrivate")
      });
    }

    return options;
  }, [
    canCreateGroupEvents,
    canCreatePrivateEvents,
    canCreatePublicEvents,
    event?.visibility,
    t
  ]);

  const recurrenceOptions = [
    { value: "NONE", label: t("eventForm.repeatNone") },
    { value: "DAILY", label: t("eventForm.repeatDaily") },
    { value: "WEEKLY", label: t("eventForm.repeatWeekly") },
    { value: "CUSTOM", label: t("eventForm.repeatCustom") }
  ];

  const weekdayOptions = [
    { label: "Mon", value: 1 },
    { label: "Tue", value: 2 },
    { label: "Wed", value: 3 },
    { label: "Thu", value: 4 },
    { label: "Fri", value: 5 },
    { label: "Sat", value: 6 },
    { label: "Sun", value: 0 }
  ];

  const recurrenceFreqValue =
    recurrencePattern === "DAILY"
      ? "DAILY"
      : recurrencePattern === "NONE"
        ? "NONE"
        : "WEEKLY";

  const toggleWeekday = (day: number) => {
    setRecurrenceDays((current) => {
      if (current.includes(day)) {
        return current.filter((value) => value !== day);
      }
      return [...current, day];
    });
  };

  return (
    <form ref={formRef} className="space-y-3" action={formAction}>
      {event?.id ? <input type="hidden" name="eventId" value={event.id} /> : null}

      {/* Section: Basics */}
      <fieldset className="space-y-3 rounded-xl border border-mist-100 bg-mist-50/40 p-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="space-y-1.5">
            <Label htmlFor={titleId}>{t("eventForm.title")}</Label>
            <Input
              id={titleId}
              name="title"
              placeholder={t("eventForm.titlePlaceholder")}
              defaultValue={event?.title ?? ""}
              required
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={typeId}>{t("eventForm.type")}</Label>
            <SelectMenu
              id={typeId}
              name="type"
              value={type}
              onValueChange={(value) => setType(value as "SERVICE" | "EVENT")}
              options={[
                { value: "SERVICE", label: t("eventForm.typeService") },
                { value: "EVENT", label: t("eventForm.typeEvent") }
              ]}
            />
          </div>
        </div>
      </fieldset>

      {/* Section: Date & Time */}
      <fieldset className="space-y-3 rounded-xl border border-mist-100 bg-mist-50/40 p-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor={dateId}>{t("eventForm.date")}</Label>
            <Input
              id={dateId}
              type="date"
              value={dateValue}
              onChange={(eventValue) => setDateValue(eventValue.currentTarget.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={startTimeId}>{t("eventForm.start")}</Label>
            <Input
              id={startTimeId}
              type="time"
              value={startTimeValue}
              onChange={(eventValue) => setStartTimeValue(eventValue.currentTarget.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={endTimeId}>{t("eventForm.end")}</Label>
            <Input
              id={endTimeId}
              type="time"
              value={endTimeValue}
              onChange={(eventValue) => setEndTimeValue(eventValue.currentTarget.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={recurrenceId}>{t("eventForm.repeats")}</Label>
          <SelectMenu
            id={recurrenceId}
            name="recurrencePattern"
            value={recurrencePattern}
            onValueChange={(value) =>
              setRecurrencePattern(value as "NONE" | "DAILY" | "WEEKLY" | "CUSTOM")
            }
            options={recurrenceOptions}
          />
        </div>

        {recurrencePattern === "WEEKLY" || recurrencePattern === "CUSTOM" ? (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
              {t("eventForm.repeatOn")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {weekdayOptions.map((day) => {
                const isActive = recurrenceDays.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleWeekday(day.value)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition focus-ring ${
                      isActive
                        ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                        : "border-mist-200 bg-white text-ink-600 hover:border-mist-300"
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {recurrencePattern !== "NONE" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={recurrenceEndsId}>{t("eventForm.ends")}</Label>
              <SelectMenu
                id={recurrenceEndsId}
                name="recurrenceEnds"
                value={recurrenceEnds}
                onValueChange={(value) => setRecurrenceEnds(value as "NEVER" | "ON")}
                options={[
                  { value: "NEVER", label: t("eventForm.endsNever") },
                  { value: "ON", label: t("eventForm.endsOnDate") }
                ]}
              />
            </div>
            {recurrenceEnds === "ON" ? (
              <div className="space-y-1.5">
                <Label htmlFor={recurrenceUntilId}>{t("eventForm.endDate")}</Label>
                <Input
                  id={recurrenceUntilId}
                  type="date"
                  value={recurrenceUntil}
                  onChange={(eventValue) => setRecurrenceUntil(eventValue.currentTarget.value)}
                  required
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </fieldset>

      <input type="hidden" name="date" value={dateValue} />
      <input type="hidden" name="startTime" value={startTimeValue} />
      <input type="hidden" name="endTime" value={endTimeValue} />
      <input type="hidden" name="recurrenceFreq" value={recurrenceFreqValue} />
      <input
        type="hidden"
        name="recurrenceByWeekday"
        value={[...recurrenceDays].sort((a, b) => a - b).join(",")}
      />
      <input type="hidden" name="recurrenceInterval" value="1" />
      <input
        type="hidden"
        name="recurrenceUntil"
        value={recurrenceEnds === "ON" ? recurrenceUntil : ""}
      />

      {/* Section: Details */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={locationId}>{t("eventForm.location")}</Label>
          <Input
            id={locationId}
            name="location"
            placeholder={t("eventForm.locationPlaceholder")}
            defaultValue={event?.location ?? ""}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={summaryId}>{t("eventForm.summary")}</Label>
          <Textarea
            id={summaryId}
            name="summary"
            placeholder={t("eventForm.summaryPlaceholder")}
            rows={3}
            defaultValue={event?.summary ?? ""}
          />
        </div>
      </div>

      {/* Section: Visibility */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={visibilityId}>{t("eventForm.visibility")}</Label>
          <SelectMenu
            id={visibilityId}
            name="visibility"
            value={visibility}
            onValueChange={(value) => setVisibility(value as "PUBLIC" | "GROUP" | "PRIVATE")}
            options={visibilityOptions}
          />
          {visibility === "GROUP" ? (
            <p className="text-xs text-ink-400">
              {t("eventForm.groupVisibilityHint")}
            </p>
          ) : null}
        </div>

        {visibility === "GROUP" ? (
          <div className="space-y-1.5">
            <Label htmlFor={groupId}>{t("eventForm.group")}</Label>
            <SelectMenu
              id={groupId}
              name="groupId"
              value={selectedGroupId}
              onValueChange={(value) => setSelectedGroupId(value)}
              placeholder={groupOptions.length ? t("eventForm.selectGroup") : t("eventForm.noGroups")}
              options={groupOptions.map((group) => ({
                value: group.id,
                label: group.name
              }))}
            />
          </div>
        ) : null}
      </div>

      {state.status === "error" ? (
        <p role="alert" className="rounded-xl border border-rose-100 bg-rose-50/60 px-3 py-2 text-xs text-rose-700">
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
  const t = useTranslations();
  const { pending } = useFormStatus();

  return (
    <div className="sticky bottom-0 mt-4 flex justify-end gap-2 border-t border-mist-100 bg-white pb-1 pt-3">
      {onCancel ? (
        <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
          {t("buttons.cancel")}
        </Button>
      ) : null}
      <Button type="submit" isLoading={pending}>
        {submitLabel}
      </Button>
    </div>
  );
}
