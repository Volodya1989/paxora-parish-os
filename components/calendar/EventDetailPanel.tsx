"use client";

import React from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { Drawer } from "@/components/ui/Drawer";
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
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-ink-400">Location</p>
        <p className="text-sm text-ink-700">{event.location ?? "Location TBA"}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-ink-400">Notes</p>
        <p className="text-sm text-ink-700">
          {event.summary ?? "No notes available yet."}
        </p>
      </div>
      <Button type="button" className="w-full">
        View details
      </Button>
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
