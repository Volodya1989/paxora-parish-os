import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import ProgressRing from "@/components/home/progress-ring";
import type {
  HomeAnnouncementPreview,
  HomeEventPreview,
  HomeWeekCompletion
} from "@/lib/queries/home";

const MAX_HIGHLIGHTS = 2;

function formatEventTime(event: HomeEventPreview) {
  const day = event.startsAt.toLocaleDateString("en-US", {
    weekday: "short"
  });
  const time = event.startsAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
  return `${day} ${time}`;
}

export type HomeHeroProps = {
  weekCompletion: HomeWeekCompletion;
  nextEvents: HomeEventPreview[];
  announcements: HomeAnnouncementPreview[];
};

export default function HomeHero({
  weekCompletion,
  nextEvents,
  announcements
}: HomeHeroProps) {
  const completionLabel = `${weekCompletion.completedCount}/${weekCompletion.totalCount} complete`;
  const highlightEvents = nextEvents.slice(0, MAX_HIGHLIGHTS);
  const highlightAnnouncements = announcements.slice(0, MAX_HIGHLIGHTS - highlightEvents.length);
  const showHighlights = highlightEvents.length + highlightAnnouncements.length > 0;

  return (
    <Card className="border-emerald-100 bg-emerald-50/50">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">This Week</p>
            <h2 className="text-h2">This Week</h2>
          </div>
          <p className="text-sm text-ink-500">Keep going — small faithful steps.</p>
          {showHighlights ? (
            <div className="space-y-1 text-xs text-ink-500">
              {highlightEvents.map((event) => (
                <p key={event.id}>{`Next: ${event.title} · ${formatEventTime(event)}`}</p>
              ))}
              {highlightAnnouncements.map((announcement) => (
                <p key={announcement.id}>{`Latest announcement: ${announcement.title}`}</p>
              ))}
            </div>
          ) : null}
          <Link className="text-sm font-medium text-ink-700 underline" href="/this-week">
            View This Week
          </Link>
        </div>

        <div className="flex items-center gap-4 rounded-card border border-emerald-100 bg-white/70 px-4 py-3">
          <ProgressRing percent={weekCompletion.percent} />
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-ink-400">Completion</p>
            <Badge tone={weekCompletion.percent >= 100 ? "success" : "neutral"}>
              {completionLabel}
            </Badge>
          </div>
        </div>
      </div>
    </Card>
  );
}
