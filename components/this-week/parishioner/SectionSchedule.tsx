import Link from "next/link";
import SectionCard from "@/components/this-week/SectionCard";
import type { EventPreview } from "@/lib/queries/this-week";
import { formatDayDate, formatTime } from "@/lib/this-week/formatters";

type SectionScheduleProps = {
  events: EventPreview[];
};

export default function SectionSchedule({ events }: SectionScheduleProps) {
  return (
    <section id="services" className="scroll-mt-24">
      <SectionCard
        title="Services & Schedule"
        action={
          <Link
            className="whitespace-nowrap text-sm font-medium text-ink-700 underline"
            href="/calendar"
          >
            View calendar
          </Link>
        }
      >
        <div className="space-y-3">
          {events.length === 0 ? (
            <div className="rounded-card border border-mist-100 bg-mist-50 px-4 py-3 text-sm text-ink-500">
              Nothing scheduled yet.{" "}
              <Link className="font-medium text-ink-700 underline" href="/calendar">
                View calendar
              </Link>
              .
            </div>
          ) : (
            events.slice(0, 3).map((event) => (
              <div
                key={event.id}
                className="rounded-card border border-mist-100 bg-white px-4 py-3"
              >
                <p className="text-xs font-semibold uppercase text-ink-400">
                  {formatDayDate(event.startsAt)} · {formatTime(event.startsAt)}
                </p>
                <p className="mt-2 text-sm font-semibold text-ink-900">{event.title}</p>
                <p className="mt-1 text-xs text-ink-500">
                  {event.location ?? "Location to be announced"}
                </p>
              </div>
            ))
          )}
        </div>
      </SectionCard>
    </section>
  );
}
