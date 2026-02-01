import Link from "next/link";
import { MegaphoneIcon } from "@/components/icons/ParishIcons";
import AccentSectionCard from "@/components/layout/AccentSectionCard";
import { routes } from "@/lib/navigation/routes";
import type { AnnouncementPreview } from "@/lib/queries/this-week";
import { formatShortDate } from "@/lib/this-week/formatters";

type SectionAnnouncementsProps = {
  announcements: AnnouncementPreview[];
};

/**
 * Section displaying the latest parish announcements.
 *
 * Shows the top 3 most recent announcements with publication date.
 * Uses an amber/warning accent color to signal news and updates.
 * Includes a "View all" link to the full announcements page.
 *
 * **Empty State:** Shows a message when no announcements are available.
 *
 * **Color System:** Amber accent (warning/news tone)
 *
 * @param props - Component props
 * @param props.announcements - Array of announcement previews to display
 * @returns Rendered announcements section with scroll anchor
 *
 * @example
 * <SectionAnnouncements announcements={announcements} />
 */
export default function SectionAnnouncements({ announcements }: SectionAnnouncementsProps) {
  return (
    <section id="announcements" className="scroll-mt-24">
      <AccentSectionCard
        title="Announcements"
        icon={<MegaphoneIcon className="h-5 w-5" />}
        borderClass="border-amber-200"
        iconClass="bg-amber-100 text-amber-700"
        action={
          <Link
            className="whitespace-nowrap text-sm font-medium text-ink-700 underline"
            href={routes.announcements}
          >
            View all
          </Link>
        }
      >
        <div className="space-y-3">
          {announcements.length === 0 ? (
            <div className="rounded-card border border-amber-100 bg-amber-50/40 px-4 py-3 text-sm text-ink-500">
              Nothing new right now. Check back soon for parish updates.
            </div>
          ) : (
            announcements.slice(0, 3).map((announcement) => {
              const postedAt =
                announcement.publishedAt ?? announcement.updatedAt ?? announcement.createdAt;
              return (
                <Link
                  key={announcement.id}
                  href={routes.announcements}
                  className="block rounded-card border border-mist-100 bg-white px-4 py-3 transition hover:border-amber-200 hover:bg-amber-50/30"
                >
                  <p className="text-sm font-semibold text-ink-900">{announcement.title}</p>
                  <p className="mt-1 text-xs text-ink-500">
                    Tap to read the full announcement.
                  </p>
                  <p className="mt-2 text-xs font-medium text-ink-400">
                    Posted {formatShortDate(postedAt)}
                  </p>
                </Link>
              );
            })
          )}
        </div>
      </AccentSectionCard>
    </section>
  );
}
