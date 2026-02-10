import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import ProgressRing from "@/components/home/progress-ring";
import type {
  HomeAnnouncementPreview,
  HomeEventPreview,
  HomeWeekCompletion
} from "@/lib/queries/home";
import type { Locale } from "@/lib/i18n/config";
import { buildLocalePathname } from "@/lib/i18n/routing";
import { getTranslator } from "@/lib/i18n/translator";

const MAX_HIGHLIGHTS = 2;

function formatEventTime(event: HomeEventPreview, locale: Locale) {
  const dateLocale = locale === "uk" ? "uk-UA" : "en-US";
  const day = event.startsAt.toLocaleDateString(dateLocale, {
    weekday: "short"
  });
  const time = event.startsAt.toLocaleTimeString(dateLocale, {
    hour: "numeric",
    minute: "2-digit"
  });
  return `${day} ${time}`;
}

export type HomeHeroProps = {
  weekCompletion: HomeWeekCompletion;
  nextEvents: HomeEventPreview[];
  announcements: HomeAnnouncementPreview[];
  locale: Locale;
};

export default function HomeHero({
  weekCompletion,
  nextEvents,
  announcements,
  locale
}: HomeHeroProps) {
  const t = getTranslator(locale);
  const completionLabel = `${weekCompletion.completedCount}/${weekCompletion.totalCount}`;
  const highlightEvents = nextEvents.slice(0, MAX_HIGHLIGHTS);
  const highlightAnnouncements = announcements.slice(0, MAX_HIGHLIGHTS - highlightEvents.length);
  const showHighlights = highlightEvents.length + highlightAnnouncements.length > 0;

  return (
    <Card className="border-emerald-100 bg-emerald-50/50">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">{t("nav.thisWeek")}</p>
            <h2 className="text-h2">{t("nav.thisWeek")}</h2>
          </div>
          <p className="text-sm text-ink-500">{t("thisWeek.quote")}</p>
          {showHighlights ? (
            <div className="space-y-1 text-xs text-ink-500">
              {highlightEvents.map((event) => (
                <p key={event.id}>{`${event.title} · ${formatEventTime(event, locale)}`}</p>
              ))}
              {highlightAnnouncements.map((announcement) => (
                <p key={announcement.id}>{`${t("thisWeek.announcements")}: ${announcement.title}`}</p>
              ))}
            </div>
          ) : null}
          <Link className="text-sm font-medium text-ink-700 underline" href={buildLocalePathname(locale, "/this-week")}>
            {t("nav.thisWeek")}
          </Link>
        </div>

        <div className="flex items-center gap-4 rounded-card border border-emerald-100 bg-white/70 px-4 py-3">
          <ProgressRing percent={weekCompletion.percent} />
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-ink-400">{completionLabel}</p>
            <Badge tone={weekCompletion.percent >= 100 ? "success" : "neutral"}>
              {weekCompletion.percent}%
            </Badge>
          </div>
        </div>
      </div>
    </Card>
  );
}
