import Link from "next/link";
import { CalendarIcon, MapPinIcon } from "@/components/icons/ParishIcons";
import AccentSectionCard from "@/components/layout/AccentSectionCard";
import { routes } from "@/lib/navigation/routes";
import type { EventPreview } from "@/lib/queries/this-week";
import { formatDayDate, formatTime } from "@/lib/this-week/formatters";
import { getLocaleFromCookies, getTranslations } from "@/lib/i18n/server";

type SectionScheduleProps = {
  events: EventPreview[];
};

/**
 * Section displaying the next upcoming parish services and events.
 *
 * Shows the top 3 upcoming events with date, time, and location information.
 * Uses an emerald/success accent color for events and calendar-related content.
 * Includes a "View calendar" link to the full calendar page.
 *
 * **Empty State:** Shows a message when no upcoming events are scheduled with a link to the calendar.
 *
 * **Color System:** Emerald accent (success/event tone)
 *
 * **Note:** This is an async component that uses server-side locale cookies.
 *
 * @param props - Component props
 * @param props.events - Array of upcoming event previews to display
 * @returns Rendered services section with scroll anchor
 *
 * @example
 * <SectionSchedule events={upcomingEvents} />
 */
export default async function SectionSchedule({ events }: SectionScheduleProps) {
  const locale = await getLocaleFromCookies();
  const t = getTranslations(locale);
  return (
    <section id="services" className="scroll-mt-24">
      <AccentSectionCard
        title="Services"
        icon={<CalendarIcon className="h-5 w-5" />}
        borderClass="border-emerald-200"
        iconClass="bg-emerald-100 text-emerald-700"
        action={
          <Link
            className="whitespace-nowrap text-sm font-medium text-ink-700 underline"
            href={routes.calendar}
          >
            View calendar
          </Link>
        }
      >
        <div className="space-y-3">
          {events.length === 0 ? (
            <div className="rounded-card border border-emerald-100 bg-emerald-50/40 px-4 py-3 text-sm text-ink-500">
              {t("empty.nothingScheduled")}.{" "}
              <Link className="font-medium text-ink-700 underline" href={routes.calendar}>
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
                <p className="mt-1 flex items-center gap-1 text-xs text-ink-500">
                  <MapPinIcon className="h-3 w-3 text-ink-400" />
                  {event.location ?? "Location to be announced"}
                </p>
              </div>
            ))
          )}
        </div>
      </AccentSectionCard>
    </section>
  );
}
