"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import RsvpButtons from "@/components/events/RsvpButtons";
import { formatRecurrenceSummary } from "@/lib/events/recurrence";
import type { CalendarEvent } from "@/lib/queries/events";
import { useTranslations } from "@/lib/i18n/provider";
import { formatTime as formatTimeLabel } from "@/lib/this-week/formatters";

type EventDetailPanelProps = {
  event: CalendarEvent | null;
  onClose: () => void;
};

function formatDate(event: CalendarEvent) {
  return event.startsAt.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric"
  });
}

function formatTime(event: CalendarEvent) {
  const startTime = formatTimeLabel(event.startsAt);
  const endTime = formatTimeLabel(event.endsAt);
  return `${startTime} – ${endTime}`;
}

function EventDetailContent({
  event,
  t,
  rsvpTotalCount,
  onRsvpUpdated
}: {
  event: CalendarEvent;
  t: (key: string) => string;
  rsvpTotalCount: number;
  onRsvpUpdated: (count: number) => void;
}) {
  return (
    <div className="space-y-4 text-sm text-ink-700">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-ink-900">{event.title}</h3>
        <p className="text-sm text-ink-500">{formatDate(event)}</p>
        <p className="text-sm text-ink-500">{formatTime(event)}</p>
        <p className="text-xs text-ink-400">{formatRecurrenceSummary(event)}</p>
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Badge tone={event.type === "SERVICE" ? "success" : "neutral"}>
            {event.type === "SERVICE" ? t("eventDetail.service") : t("eventDetail.event")}
          </Badge>
          <Badge tone={event.visibility === "PUBLIC" ? "neutral" : "warning"}>
            {event.visibility === "PUBLIC"
              ? t("common.public")
              : event.visibility === "GROUP"
                ? t("eventDetail.group")
                : t("common.private")}
          </Badge>
        </div>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-ink-400">{t("eventDetail.location")}</p>
        <p className="text-sm text-ink-700">{event.location ?? t("eventDetail.locationTBA")}</p>
      </div>
      {event.group?.name ? (
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-400">{t("eventDetail.group")}</p>
          <p className="text-sm text-ink-700">{event.group.name}</p>
        </div>
      ) : null}
      <div>
        <p className="text-xs uppercase tracking-wide text-ink-400">{t("eventDetail.notes")}</p>
        <p className="text-sm text-ink-700">{event.summary}</p>
      </div>
      <div className="space-y-3 border-t border-mist-100 pt-4">
        <p className="text-xs uppercase tracking-wide text-ink-400">{t("eventDetail.rsvp")}</p>
        <p className="text-sm text-ink-600">{t("eventDetail.totalRsvps").replace("{count}", String(rsvpTotalCount))}</p>
        <RsvpButtons
          eventId={event.id}
          initialResponse={event.rsvpResponse}
          onRsvpUpdated={onRsvpUpdated}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href={`/events/${event.id}`} className="flex-1">
          <Button type="button" variant="secondary" className="w-full">
            {t("eventDetail.viewDetails")}
          </Button>
        </Link>
        {event.canManage ? (
          <>
            <Link href={`/calendar/events/${event.id}/edit`} className="flex-1">
              <Button type="button" variant="ghost" className="w-full">
                {t("buttons.edit")}
              </Button>
            </Link>
            <Link href={`/calendar/events/${event.id}/delete`} className="flex-1">
              <Button type="button" variant="danger" className="w-full">
                {t("buttons.delete")}
              </Button>
            </Link>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default function EventDetailPanel({ event, onClose }: EventDetailPanelProps) {
  const t = useTranslations();
  const [rsvpTotalCount, setRsvpTotalCount] = useState(event?.rsvpTotalCount ?? 0);

  useEffect(() => {
    setRsvpTotalCount(event?.rsvpTotalCount ?? 0);
  }, [event]);

  return (
    <>
      <Modal open={Boolean(event)} onClose={onClose} title={t("eventDetail.title")}>
        {event ? (
          <EventDetailContent
            event={event}
            t={t}
            rsvpTotalCount={rsvpTotalCount}
            onRsvpUpdated={setRsvpTotalCount}
          />
        ) : null}
      </Modal>
      <Drawer open={Boolean(event)} onClose={onClose} title={t("eventDetail.title")}>
        {event ? (
          <EventDetailContent
            event={event}
            t={t}
            rsvpTotalCount={rsvpTotalCount}
            onRsvpUpdated={setRsvpTotalCount}
          />
        ) : null}
      </Drawer>
    </>
  );
}
