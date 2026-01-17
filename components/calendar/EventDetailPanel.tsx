"use client";

import React from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
import RsvpButtons from "@/components/events/RsvpButtons";
import type { CalendarEvent } from "@/lib/queries/events";

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
  const startTime = event.startsAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
  const endTime = event.endsAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
  return `${startTime} – ${endTime}`;
}

function EventDetailContent({ event }: { event: CalendarEvent }) {
  return (
    <div className="space-y-4 text-sm text-ink-700">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-ink-900">{event.title}</h3>
        <p className="text-sm text-ink-500">{formatDate(event)}</p>
        <p className="text-sm text-ink-500">{formatTime(event)}</p>
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Badge tone={event.type === "SERVICE" ? "success" : "neutral"}>
            {event.type === "SERVICE" ? "Service" : "Event"}
          </Badge>
          <Badge tone={event.visibility === "PUBLIC" ? "neutral" : "warning"}>
            {event.visibility === "PUBLIC"
              ? "Public"
              : event.visibility === "GROUP"
                ? "Group"
                : "Private"}
          </Badge>
        </div>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-ink-400">Location</p>
        <p className="text-sm text-ink-700">{event.location ?? "Location TBA"}</p>
      </div>
      {event.group?.name ? (
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-400">Group</p>
          <p className="text-sm text-ink-700">{event.group.name}</p>
        </div>
      ) : null}
      <div>
        <p className="text-xs uppercase tracking-wide text-ink-400">Notes</p>
        <p className="text-sm text-ink-700">{event.summary}</p>
      </div>
      <div className="space-y-3 border-t border-mist-100 pt-4">
        <p className="text-xs uppercase tracking-wide text-ink-400">RSVP</p>
        <RsvpButtons eventId={event.id} initialResponse={event.rsvpResponse} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href={`/events/${event.id}`} className="flex-1">
          <Button type="button" variant="secondary" className="w-full">
            View details
          </Button>
        </Link>
        {event.canManage ? (
          <>
            <Link href={`/calendar/events/${event.id}/edit`} className="flex-1">
              <Button type="button" variant="ghost" className="w-full">
                Edit
              </Button>
            </Link>
            <Link href={`/calendar/events/${event.id}/delete`} className="flex-1">
              <Button type="button" variant="danger" className="w-full">
                Delete
              </Button>
            </Link>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default function EventDetailPanel({ event, onClose }: EventDetailPanelProps) {
  return (
    <>
      <div className="hidden lg:block">
        <Card>
          {event ? (
            <EventDetailContent event={event} />
          ) : (
            <div className="space-y-2 text-sm text-ink-500">
              <h3 className="text-lg font-semibold text-ink-900">Event details</h3>
              <p>Select an event to see more information.</p>
            </div>
          )}
        </Card>
      </div>
      <Drawer open={Boolean(event)} onClose={onClose} title="Event details">
        {event ? <EventDetailContent event={event} /> : null}
      </Drawer>
    </>
  );
}
