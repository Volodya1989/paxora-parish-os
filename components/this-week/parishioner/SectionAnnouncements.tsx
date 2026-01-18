import Link from "next/link";
import SectionCard from "@/components/this-week/SectionCard";
import type { AnnouncementPreview } from "@/lib/queries/this-week";
import { formatShortDate } from "@/lib/this-week/formatters";

type SectionAnnouncementsProps = {
  announcements: AnnouncementPreview[];
};

export default function SectionAnnouncements({ announcements }: SectionAnnouncementsProps) {
  return (
    <section id="announcements" className="scroll-mt-24">
      <SectionCard
        title="Announcements"
        action={
          <Link
            className="whitespace-nowrap text-sm font-medium text-ink-700 underline"
            href="/announcements"
          >
            View all announcements
          </Link>
        }
      >
        <div className="space-y-3">
          {announcements.length === 0 ? (
            <div className="rounded-card border border-mist-100 bg-mist-50 px-4 py-3 text-sm text-ink-500">
              Nothing new right now. Check back soon for parish updates.
            </div>
          ) : (
            announcements.slice(0, 3).map((announcement) => {
              const postedAt =
                announcement.publishedAt ?? announcement.updatedAt ?? announcement.createdAt;
              return (
                <Link
                  key={announcement.id}
                  href="/announcements"
                  className="block rounded-card border border-mist-100 bg-white px-4 py-3 transition hover:border-primary-200 hover:bg-primary-50/30"
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
      </SectionCard>
    </section>
  );
}
